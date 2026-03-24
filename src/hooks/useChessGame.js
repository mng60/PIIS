import { useTurnGameRelay } from './useTurnGameRelay';

const playerName = (user) => user.full_name || user.email.split('@')[0];

/**
 * Chess-specific multiplayer relay.
 * Thin wrapper over useTurnGameRelay that configures the chess message protocol:
 *   - Incoming action:  CHESS_MOVE  { from, to, promo }
 *   - Outgoing action:  CHESS_OPPONENT_MOVE { from, to, promo }
 *   - Guest player info: PLAYER_INFO { color: 'black', ... }
 *   - Host player info:  PLAYER_INFO { color: 'white', ... }  (sent once on game start)
 */
export function useChessGame({ isPlaying, user, gameId, iframeRef, onRoomCodeChange }) {
  return useTurnGameRelay({
    isPlaying,
    user,
    gameId,
    iframeRef,
    onRoomCodeChange,

    actionType: 'CHESS_MOVE',

    extractAction: (msg) => ({ from: msg.from, to: msg.to, promo: msg.promo }),

    buildOpponentMessage: (action) => ({
      type: 'CHESS_OPPONENT_MOVE',
      from: action.from,
      to: action.to,
      promo: action.promo,
    }),

    onGuestJoined: (session, iframeRef, user) => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'PLAYER_INFO',
        player: { name: playerName(user), email: user.email },
        color: 'black',
        opponentName: session.host_name || 'Rival',
      }, '*');
    },

    onHostGameStart: (session, iframeRef, user) => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'PLAYER_INFO',
        player: { name: playerName(user), email: user.email },
        color: 'white',
        opponentName: session.guest_name || 'Rival',
      }, '*');
    },
  });
}
