import { useRef, useEffect } from 'react';
import { createSession, getSession, updateSession } from '@/api/sessions';

/**
 * Manages the chess multiplayer relay: message handling (CREATE_ROOM / JOIN_ROOM / CHESS_MOVE)
 * and polling for opponent moves. Communicates back to the chess component via postMessage.
 *
 * @param {object} options
 * @param {boolean}       options.isPlaying        - Whether the game session is active
 * @param {object|null}   options.user             - Authenticated user
 * @param {string}        options.gameId
 * @param {React.RefObject} options.iframeRef      - Ref attached to the game iframe
 * @param {function}      options.onRoomCodeChange - Called when a room code is created/joined
 */
export function useChessRelay({ isPlaying, user, gameId, iframeRef, onRoomCodeChange }) {
  const chessSessionRef     = useRef(null);
  const chessRoleRef        = useRef(null);
  const lastDeliveredIdxRef = useRef(-1);
  const whiteNotifiedRef    = useRef(false);

  // Handles incoming messages from the chess component: CREATE_ROOM, JOIN_ROOM, CHESS_MOVE
  useEffect(() => {
    if (!isPlaying || !user) return;

    const handler = async (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'CREATE_ROOM') {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
          const session = await createSession(code, gameId);
          chessSessionRef.current     = session;
          chessRoleRef.current        = 'host';
          lastDeliveredIdxRef.current = -1;
          whiteNotifiedRef.current    = false;
          iframeRef.current?.contentWindow?.postMessage({ type: 'ROOM_CREATED', code }, '*');
          onRoomCodeChange?.(code);
        } catch (e) { console.error(e); }
      }

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
          chessSessionRef.current     = { ...session, guest_email: user.email, status: 'playing' };
          chessRoleRef.current        = 'guest';
          lastDeliveredIdxRef.current = -1;
          iframeRef.current?.contentWindow?.postMessage({
            type: 'PLAYER_INFO',
            player: { name: user.full_name || user.email.split('@')[0], email: user.email },
            color: 'black',
            opponentName: session.host_name || 'Rival',
          }, '*');
        } catch (e) { console.error(e); }
      }

      if (msg.type === 'CHESS_MOVE' && chessSessionRef.current) {
        try {
          const s     = chessSessionRef.current;
          const moves = [...(s.game_state?.moves || []), { from: msg.from, to: msg.to, promo: msg.promo, player: chessRoleRef.current }];
          await updateSession(s.room_code, { game_state: { moves } });
          chessSessionRef.current = { ...s, game_state: { moves } };
        } catch (e) { console.error(e); }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isPlaying, user, gameId]);

  // Polls the session and delivers opponent moves + player info to the chess component
  useEffect(() => {
    if (!isPlaying || !user) return;

    const poll = async () => {
      const session = chessSessionRef.current;
      if (!session) return;
      try {
        const latest = await getSession(session.room_code);
        if (!latest) return;
        chessSessionRef.current = latest;

        const moves   = latest.game_state?.moves || [];
        const myColor = chessRoleRef.current;

        if (myColor === 'host' && latest.status === 'playing' && !whiteNotifiedRef.current) {
          whiteNotifiedRef.current = true;
          iframeRef.current?.contentWindow?.postMessage({
            type: 'PLAYER_INFO',
            player: { name: user.full_name || user.email.split('@')[0], email: user.email },
            color: 'white',
            opponentName: latest.guest_name || 'Rival',
          }, '*');
        }

        for (let i = lastDeliveredIdxRef.current + 1; i < moves.length; i++) {
          if (moves[i].player !== myColor) {
            iframeRef.current?.contentWindow?.postMessage({
              type: 'CHESS_OPPONENT_MOVE',
              from: moves[i].from,
              to: moves[i].to,
              promo: moves[i].promo,
            }, '*');
          }
          lastDeliveredIdxRef.current = i;
        }
      } catch { /* silently ignore polling errors */ }
    };

    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [isPlaying, user]);
}
