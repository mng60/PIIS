import { useRef, useEffect } from 'react';
import { createSession, getSession, updateSession } from '@/api/sessions';

/**
 * Generic relay hook for turn-based multiplayer board games.
 *
 * Handles the full session lifecycle:
 *   - CREATE_ROOM  → creates a DB session, replies ROOM_CREATED
 *   - JOIN_ROOM    → validates and joins the session
 *   - [actionType] → stores the player's action in game_state.actions
 *   - Polling      → fetches the session every 1.5 s and delivers
 *                    undelivered opponent actions to the iframe
 *
 * All game-specific behavior (message types, action shape, player info
 * payload) is injected via callbacks so this hook stays reusable.
 *
 * @param {object}   opts
 * @param {boolean}  opts.isPlaying          - Whether the game session is active
 * @param {object}   opts.user               - Authenticated user
 * @param {string}   opts.gameId
 * @param {React.RefObject} opts.iframeRef   - Ref attached to the game iframe
 * @param {function} opts.onRoomCodeChange   - Called with the room code when created/joined
 *
 * @param {string}   opts.actionType         - Incoming message type that stores an action
 *                                             (default: 'GAME_ACTION')
 * @param {function} opts.extractAction      - (msg) => object  — what to persist per action
 * @param {function} opts.buildOpponentMessage - (action) => postMessage payload sent to opponent
 *
 * @param {function} [opts.onGuestJoined]    - (session, iframeRef, user) => void
 *                                             Called once when this client joins as guest.
 *                                             Use it to send game-specific player info.
 * @param {function} [opts.onHostGameStart]  - (session, iframeRef, user) => void
 *                                             Called once (via polling) when the host detects
 *                                             a guest has joined and the game moves to 'playing'.
 *                                             Use it to send game-specific player info to the host.
 */
export function useTurnGameRelay({
  isPlaying,
  user,
  gameId,
  iframeRef,
  onRoomCodeChange,

  actionType = 'GAME_ACTION',
  extractAction,
  buildOpponentMessage,

  onGuestJoined,
  onHostGameStart,
}) {
  const sessionRef          = useRef(null);
  const roleRef             = useRef(null);       // 'host' | 'guest'
  const lastDeliveredIdxRef = useRef(-1);
  const hostNotifiedRef     = useRef(false);

  // ── Message handler: CREATE_ROOM / JOIN_ROOM / [actionType] ───────────────
  useEffect(() => {
    if (!isPlaying || !user) return;

    const handler = async (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      // ── CREATE_ROOM ──────────────────────────────────────────────────────
      if (msg.type === 'CREATE_ROOM') {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
          const session = await createSession(code, gameId);
          sessionRef.current          = session;
          roleRef.current             = 'host';
          lastDeliveredIdxRef.current = -1;
          hostNotifiedRef.current     = false;
          iframeRef.current?.contentWindow?.postMessage({ type: 'ROOM_CREATED', code }, '*');
          onRoomCodeChange?.(code);
        } catch (e) { console.error('[useTurnGameRelay] CREATE_ROOM error:', e); }
      }

      // ── JOIN_ROOM ────────────────────────────────────────────────────────
      if (msg.type === 'JOIN_ROOM') {
        try {
          const session = await getSession(msg.code);
          if (!session || session.status !== 'waiting') {
            iframeRef.current?.contentWindow?.postMessage({ type: 'ROOM_ERROR', message: 'Sala no encontrada' }, '*');
            return;
          }
          await updateSession(msg.code, {
            guest_email: user.email,
            guest_name: user.full_name || user.email.split('@')[0],
            status: 'playing',
          });
          sessionRef.current          = { ...session, guest_email: user.email, status: 'playing' };
          roleRef.current             = 'guest';
          lastDeliveredIdxRef.current = -1;
          onGuestJoined?.(session, iframeRef, user);
        } catch (e) { console.error('[useTurnGameRelay] JOIN_ROOM error:', e); }
      }

      // ── GAME ACTION (e.g. CHESS_MOVE, CHECKERS_MOVE, …) ─────────────────
      if (msg.type === actionType && sessionRef.current) {
        try {
          const s       = sessionRef.current;
          const actions = [...(s.game_state?.actions || []), { ...extractAction(msg), player: roleRef.current }];
          await updateSession(s.room_code, { game_state: { actions } });
          sessionRef.current = { ...s, game_state: { actions } };
        } catch (e) { console.error('[useTurnGameRelay] action error:', e); }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isPlaying, user, gameId]);

  // ── Polling: sync opponent actions + notify host when game starts ─────────
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

        // Notify host once when the guest has joined and the game started
        if (myRole === 'host' && latest.status === 'playing' && !hostNotifiedRef.current) {
          hostNotifiedRef.current = true;
          onHostGameStart?.(latest, iframeRef, user);
        }

        // Deliver any opponent actions not yet delivered to the iframe
        for (let i = lastDeliveredIdxRef.current + 1; i < actions.length; i++) {
          if (actions[i].player !== myRole) {
            iframeRef.current?.contentWindow?.postMessage(
              buildOpponentMessage(actions[i]),
              '*'
            );
          }
          lastDeliveredIdxRef.current = i;
        }
      } catch { /* silently ignore transient polling errors */ }
    };

    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [isPlaying, user]);
}
