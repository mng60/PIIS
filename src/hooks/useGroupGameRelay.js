import { useRef, useEffect, useState } from 'react';
import { createSession, getSession, updateSession } from '@/api/sessions';

/**
 * Generic relay hook for multi-player games (up to N players).
 *
 * Handles the full session lifecycle:
 *   - CREATE_ROOM  → creates a DB session, initialized with max_players
 *   - JOIN_ROOM    → validates and joins the session, appending user to players list
 *   - START_GAME   → forces the session to start (playing status) early
 *   - [actionType] → stores the player's action in game_state.actions
 *   - Polling      → fetches the session every 1.5 s and delivers
 *                    undelivered actions to the iframe
 *
 * @param {object}   opts
 * @param {boolean}  opts.isPlaying          - Whether the game session is active
 * @param {object}   opts.user               - Authenticated user
 * @param {string}   opts.gameId
 * @param {React.RefObject} opts.iframeRef   - Ref attached to the game iframe
 * @param {function} opts.onRoomCodeChange   - Called with the room code when created/joined
 *
 * @param {string}   opts.actionType           - Incoming message type that stores an action
 *                                               (default: 'GAME_ACTION')
 * @param {function} opts.extractAction        - (msg) => object  — what to persist per action
 * @param {function} opts.buildOpponentMessage - (action) => postMessage payload sent to opponent
 * @param {function} [opts.formatMoveLabel]    - (action) => string  — label for move history display
 *
 * @param {function} [opts.onPlayerJoined]   - (session, iframeRef, user) => void
 * @param {function} [opts.onGameStart]      - (session, iframeRef, user) => void
 */
export function useGroupGameRelay({
  isPlaying,
  user,
  gameId,
  iframeRef,
  onRoomCodeChange,

  actionType = 'GAME_ACTION',
  extractAction,
  buildOpponentMessage,
  formatMoveLabel,

  onPlayerJoined,
  onGameStart,
}) {
  const [moveHistory, setMoveHistory] = useState([]);
  const sessionRef          = useRef(null);
  const roleRef             = useRef(null);       // 'player_0', 'player_1', etc.
  const lastDeliveredIdxRef = useRef(-1);
  const startNotifiedRef    = useRef(false);

  // ── Message handler: CREATE_ROOM / JOIN_ROOM / START_GAME / [actionType] ──
  useEffect(() => {
    if (!isPlaying || !user) return;

    const handler = async (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      // ── CREATE_ROOM ──────────────────────────────────────────────────────
      if (msg.type === 'CREATE_ROOM') {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const maxPlayers = msg.maxPlayers || 6; // Default to 6 if not provided by the game
        try {
          const session = await createSession(code, gameId, {}, maxPlayers);
          sessionRef.current          = session;
          roleRef.current             = 'player_0';
          lastDeliveredIdxRef.current = -1;
          startNotifiedRef.current    = false;
          iframeRef.current?.contentWindow?.postMessage({ type: 'ROOM_CREATED', code, role: 'player_0' }, '*');
          onRoomCodeChange?.(code);
        } catch (e) { console.error('[useGroupGameRelay] CREATE_ROOM error:', e); }
      }

      // ── JOIN_ROOM ────────────────────────────────────────────────────────
      if (msg.type === 'JOIN_ROOM') {
        try {
          const session = await getSession(msg.code);
          if (!session || session.status !== 'waiting') {
            iframeRef.current?.contentWindow?.postMessage({ type: 'ROOM_ERROR', message: 'Sala no encontrada o ya empezó' }, '*');
            return;
          }

          let players = session.players || [];
          let userIndex = players.findIndex(p => p.email === user.email);
          let assignedRole = `player_${userIndex}`;

          if (userIndex === -1) {
            if (players.length >= session.max_players) {
                iframeRef.current?.contentWindow?.postMessage({ type: 'ROOM_ERROR', message: 'La sala está llena' }, '*');
                return;
            }
            assignedRole = `player_${players.length}`;
            players = [...players, { email: user.email, name: user.full_name || user.email.split('@')[0], role: assignedRole }];
            
            const isFull = players.length >= session.max_players;
            
            await updateSession(msg.code, {
              players,
              status: isFull ? 'playing' : 'waiting',
              guest_email: players.length === 2 ? user.email : session.guest_email, // backwards compatibility
              guest_name: players.length === 2 ? (user.full_name || user.email.split('@')[0]) : session.guest_name,
            });
            session.players = players;
            if (isFull) session.status = 'playing';
          }

          sessionRef.current          = session;
          roleRef.current             = assignedRole;
          lastDeliveredIdxRef.current = -1;
          
          iframeRef.current?.contentWindow?.postMessage({ type: 'ROOM_JOINED', code: msg.code, role: assignedRole, players }, '*');
          onPlayerJoined?.(session, iframeRef, user);
        } catch (e) { console.error('[useGroupGameRelay] JOIN_ROOM error:', e); }
      }

      // ── START_GAME (Explicitly start early if 4-5 players are present) ───
      if (msg.type === 'START_GAME' && sessionRef.current) {
        try {
            if (roleRef.current !== 'player_0') {
               iframeRef.current?.contentWindow?.postMessage({ type: 'ROOM_ERROR', message: 'Solo el creador puede iniciar la partida' }, '*');
               return; 
            }
            const s = sessionRef.current;
            await updateSession(s.room_code, { status: 'playing' });
            sessionRef.current = { ...s, status: 'playing' };
        } catch (e) { console.error('[useGroupGameRelay] START_GAME error:', e); }
      }


      // ── GAME ACTION ──────────────────────────────────────────────────────
      if (msg.type === actionType && sessionRef.current) {
        try {
          const s       = sessionRef.current;
          const action  = { ...extractAction(msg), player: roleRef.current };
          const actions = [...(s.game_state?.actions || []), action];
          await updateSession(s.room_code, { game_state: { ...(s.game_state || {}), actions } });
          sessionRef.current = { ...s, game_state: { ...(s.game_state || {}), actions } };
          if (formatMoveLabel) {
            setMoveHistory(prev => [...prev, { move: formatMoveLabel(action), player: action.player }]);
          }
        } catch (e) { console.error('[useGroupGameRelay] action error:', e); }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isPlaying, user, gameId]);

  // ── Polling: sync opponent actions + notify when game starts ──────────────
  useEffect(() => {
    if (!isPlaying || !user) return;

    const poll = async () => {
      const session = sessionRef.current;
      if (!session) return;
      try {
        const latest = await getSession(session.room_code);
        if (!latest) return;
        sessionRef.current = latest;

        const actions = latest.game_state?.actions || [];
        const myRole  = roleRef.current;

        // Notify when the game status switches to 'playing'
        if (latest.status === 'playing' && !startNotifiedRef.current) {
          startNotifiedRef.current = true;
          iframeRef.current?.contentWindow?.postMessage({ type: 'GAME_STARTED', players: latest.players }, '*');
          onGameStart?.(latest, iframeRef, user);
        }

        // Deliver any opponent actions not yet delivered to the iframe
        for (let i = lastDeliveredIdxRef.current + 1; i < actions.length; i++) {
          const action = actions[i];
          if (action.player !== myRole) {
            iframeRef.current?.contentWindow?.postMessage(buildOpponentMessage(action), '*');
            if (formatMoveLabel) {
              setMoveHistory(prev => [...prev, { move: formatMoveLabel(action), player: action.player }]);
            }
          }
          lastDeliveredIdxRef.current = i;
        }
      } catch { /* silently ignore transient polling errors */ }
    };

    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [isPlaying, user]);

  return { moveHistory };
}
