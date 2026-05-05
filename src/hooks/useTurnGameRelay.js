import { useRef, useState, useEffect } from 'react';
import { createSession, getSession, updateSession, joinSession, getSessionPlayers, addSessionPlayer } from '@/api/sessions';

function getNextActiveTurnSeat(players, currentSeat, fallbackMaxPlayers) {
  const activeSeats = players
    .filter(player => player.status === 'active')
    .map(player => player.seat)
    .sort((a, b) => a - b);

  if (!activeSeats.length) {
    return (Number(currentSeat) + 1) % fallbackMaxPlayers;
  }

  const seatNum = Number(currentSeat);
  const currentIndex = activeSeats.findIndex(seat => seat === seatNum);
  if (currentIndex === -1) {
    return activeSeats[0];
  }
  return activeSeats[(currentIndex + 1) % activeSeats.length];
}

export function useTurnGameRelay({
  isPlaying, user, gameId, iframeRef, onRoomCodeChange,
  actionType = 'GAME_ACTION', extractAction, buildOpponentMessage, formatMoveLabel,
  onGuestJoined, onHostGameStart,
  maxPlayers = 2,
  minPlayers = 2,
  enforceTurns = false,
  waitForStart = false,  // When true: don't enable turns until session.status === 'playing'
  manualStart = false,
  replayPastActions = false,
  closeOnAbandon = true,
  onGameStarted = null,  // Called once when session transitions to 'playing'
}) {
  const [moveHistory, setMoveHistory] = useState([]);
  const [roomCode, setRoomCode] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);

  const playerIndexRef = useRef(null);
  const roleRef = useRef(null); // 'host' | 'guest' — kept for onGuestJoined/onHostGameStart callbacks
  const lastDeliveredIdxRef = useRef(-1);
  const isUpdatingRef = useRef(false);
  const hostNotifiedRef = useRef(false);
  const gameStartedRef = useRef(false);

  // Notify server on page unload so opponents get the ABANDON action
  useEffect(() => {
    if (!closeOnAbandon) return;

    const notifyAbandon = () => {
      if (!roomCode || playerIndexRef.current === null) return;
      getSession(roomCode).then(latest => {
        if (!latest) return;
        const actions = [...(latest.game_state?.actions || []), { type: 'ABANDON', player: playerIndexRef.current }];
        updateSession(roomCode, { game_state: { actions } }).catch(() => {});
      }).catch(() => {});
    };
    window.addEventListener('beforeunload', notifyAbandon);
    return () => {
      notifyAbandon();
      window.removeEventListener('beforeunload', notifyAbandon);
    };
  }, [closeOnAbandon, roomCode]);

  // Message handler: CREATE_ROOM / JOIN_ROOM / [actionType]
  useEffect(() => {
    if (!isPlaying || !user) return;

    const handler = async (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'CREATE_ROOM') {
        if (playerIndexRef.current !== null) return; // guard: ya procesado
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
          await createSession(
            code,
            gameId,
            manualStart ? { manualStart: true } : {},
            'normal',
            { minPlayers, maxPlayers, initialTurn: '0' }
          );
          await addSessionPlayer(code, { seat: 0, role: 'host' });
          playerIndexRef.current = 0;
          roleRef.current = 'host';
          lastDeliveredIdxRef.current = -1;
          hostNotifiedRef.current = false;
          gameStartedRef.current = false;
          setRoomCode(code);
          if (!waitForStart) setIsMyTurn(true);
          onRoomCodeChange?.(code);
          iframeRef.current?.contentWindow?.postMessage({ type: 'ROOM_CREATED', code }, '*');
          iframeRef.current?.contentWindow?.postMessage({ type: 'ASSIGN_COLOR', color: 'rojo', index: 0 }, '*');
          if (!waitForStart) iframeRef.current?.contentWindow?.postMessage({ type: 'UPDATE_TURN', isMyTurn: true }, '*');
        } catch (e) { console.error('[useTurnGameRelay] CREATE_ROOM error:', e); }
      }

      if (msg.type === 'JOIN_ROOM') {
        if (playerIndexRef.current !== null) return; // guard: ya procesado
        try {
          const session = await joinSession(msg.code);
          const players = await getSessionPlayers(msg.code);
          const me = players.find(p => p.user_email === user.email);
          const myIndex = me ? me.seat : players.length - 1;
          playerIndexRef.current = myIndex;
          roleRef.current = 'guest';
          lastDeliveredIdxRef.current = -1;
          hostNotifiedRef.current = false;
          gameStartedRef.current = session?.status === 'playing';
          setRoomCode(msg.code);
          onRoomCodeChange?.(msg.code);
          const colors = ['rojo', 'azul', 'amarillo', 'verde'];
          iframeRef.current?.contentWindow?.postMessage({
            type: 'ASSIGN_COLOR', color: colors[myIndex] || 'azul', index: myIndex,
          }, '*');
          onGuestJoined?.(session, iframeRef, user);
          if (session?.status === 'playing') {
            onGameStarted?.();
          }
        } catch (e) { console.error('[useTurnGameRelay] JOIN_ROOM error:', e); }
      }

      if (msg.type === actionType && roomCode && !isUpdatingRef.current) {
        if (enforceTurns && !isMyTurn) return;
        isUpdatingRef.current = true;
        try {
          const latest = await getSession(roomCode);
          const action = { ...extractAction(msg), player: playerIndexRef.current };
          const actions = [...(latest.game_state?.actions || []), action];

          let nextTurn = playerIndexRef.current;
          if (!msg.keepTurn) {
            if (maxPlayers > 2) {
              const players = await getSessionPlayers(roomCode).catch(() => []);
              nextTurn = getNextActiveTurnSeat(players, playerIndexRef.current, maxPlayers);
            } else {
              nextTurn = (playerIndexRef.current + 1) % maxPlayers;
            }
          }

          await updateSession(roomCode, {
            game_state: { actions },
            current_turn: String(nextTurn),
          });

          if (formatMoveLabel) {
            setMoveHistory(prev => [...prev, { move: formatMoveLabel(action), player: String(action.player) }]);
          }

          if (enforceTurns && !msg.keepTurn) {
            setIsMyTurn(false);
            iframeRef.current?.contentWindow?.postMessage({ type: 'UPDATE_TURN', isMyTurn: false }, '*');
          }
        } catch (e) { console.error('[useTurnGameRelay] action error:', e); }
        finally { isUpdatingRef.current = false; }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [
    actionType,
    enforceTurns,
    gameId,
    iframeRef,
    isMyTurn,
    isPlaying,
    manualStart,
    maxPlayers,
    minPlayers,
    onGameStarted,
    onGuestJoined,
    onRoomCodeChange,
    roomCode,
    user,
    waitForStart,
  ]);

  // Polling: sync opponent actions, turn state, and host-start notification
  useEffect(() => {
    if (!isPlaying || !roomCode) return;

    const poll = async () => {
      if (isUpdatingRef.current) return;
      try {
        const latest = await getSession(roomCode);
        if (!latest || latest.error) throw new Error('Sala muerta');

        const actions = latest.game_state?.actions || [];

        if (closeOnAbandon && actions.some(a => a.type === 'ABANDON')) {
          throw new Error('Jugador abandono');
        }

        // Notify once when game transitions from waiting → playing
        if (waitForStart && !gameStartedRef.current && latest.status === 'playing') {
          gameStartedRef.current = true;
          onGameStarted?.();
        }

        const gameActive = !waitForStart || latest.status === 'playing';

        if (enforceTurns && gameActive) {
          const turnStatus = String(latest.current_turn) === String(playerIndexRef.current);
          if (turnStatus !== isMyTurn) {
            setIsMyTurn(turnStatus);
            iframeRef.current?.contentWindow?.postMessage({ type: 'UPDATE_TURN', isMyTurn: turnStatus }, '*');
          }
        }

        if (playerIndexRef.current === 0 && latest.status === 'playing' && !hostNotifiedRef.current) {
          hostNotifiedRef.current = true;
          onHostGameStart?.(latest, iframeRef, user);
        }

        const newMoves = [];
        if (gameActive) {
          const replaying = replayPastActions && lastDeliveredIdxRef.current < 0;
          for (let i = lastDeliveredIdxRef.current + 1; i < actions.length; i++) {
            const act = actions[i];
            const isAbandon = act.type === 'ABANDON';
            const isSelfAction = String(act.player) === String(playerIndexRef.current);

            if (!isAbandon) {
              if (replaying || !isSelfAction) {
                iframeRef.current?.contentWindow?.postMessage(
                  buildOpponentMessage({ ...act, replay: replaying, isSelfAction }),
                  '*'
                );
              }
              if (formatMoveLabel) {
                newMoves.push({ move: formatMoveLabel(act), player: String(act.player) });
              }
            }

            lastDeliveredIdxRef.current = i;
          }
        }
        if (newMoves.length > 0) setMoveHistory(prev => [...prev, ...newMoves]);

      } catch (e) {
        setRoomCode(null);
        setIsMyTurn(false);
        setMoveHistory([]);
        iframeRef.current?.contentWindow?.postMessage({ type: 'ROOM_CLOSED' }, '*');
      }
    };

    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [
    buildOpponentMessage,
    closeOnAbandon,
    enforceTurns,
    iframeRef,
    isMyTurn,
    isPlaying,
    onGameStarted,
    onHostGameStart,
    replayPastActions,
    roomCode,
    user,
    waitForStart,
  ]);

  return { moveHistory, roomCode, isMyTurn };
}
