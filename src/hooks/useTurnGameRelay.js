import { useRef, useState, useEffect } from 'react';
import { createSession, getSession, updateSession, joinSession } from '@/api/sessions';

export function useTurnGameRelay({
  isPlaying, user, gameId, iframeRef, onRoomCodeChange,
  actionType = 'GAME_ACTION', extractAction, buildOpponentMessage, formatMoveLabel,
  onGuestJoined, onHostGameStart,
}) {
  const [moveHistory, setMoveHistory] = useState([]);
  const [roomCode, setRoomCode] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  
  const playerIndexRef = useRef(null);
  const lastDeliveredIdxRef = useRef(-1);
  const isUpdatingRef = useRef(false);
  const hostNotifiedRef = useRef(false);

  // 1. EL CABALLO DE TROYA: En vez de DELETE, enviamos una "jugada" de abandono
  useEffect(() => {
    const avisarAbandono = () => {
      if (roomCode && playerIndexRef.current !== null) {
        getSession(roomCode).then(latest => {
          if (!latest) return;
          const actions = [...(latest.game_state?.actions || []), { type: 'ABANDON', player: playerIndexRef.current }];
          updateSession(roomCode, { game_state: { actions } }).catch(() => {});
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', avisarAbandono);
    
    return () => {
      avisarAbandono();
      window.removeEventListener('beforeunload', avisarAbandono);
    };
  }, [roomCode]);

  // 2. ESCUCHAR AL IFRAME
  useEffect(() => {
    if (!isPlaying || !user) return;

    const handler = async (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'CREATE_ROOM') {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
          await createSession(code, gameId);
          playerIndexRef.current = 0;
          setRoomCode(code);
          setIsMyTurn(true);
          onRoomCodeChange?.(code);
          iframeRef.current?.contentWindow?.postMessage({ type: 'ROOM_CREATED', code }, '*');
          iframeRef.current?.contentWindow?.postMessage({ type: 'ASSIGN_COLOR', color: 'rojo', index: 0 }, '*');
          iframeRef.current?.contentWindow?.postMessage({ type: 'UPDATE_TURN', isMyTurn: true }, '*');
        } catch (e) {}
      }

      if (msg.type === 'JOIN_ROOM') {
        try {
          const session = await joinSession(msg.code);
          const myIndex = session.participants.findIndex(p => p.email === user.email);
          playerIndexRef.current = myIndex;
          setRoomCode(msg.code);
          onRoomCodeChange?.(msg.code);
          const colors = ['rojo', 'azul', 'amarillo', 'verde'];
          iframeRef.current?.contentWindow?.postMessage({ 
            type: 'ASSIGN_COLOR', color: colors[myIndex] || 'azul', index: myIndex 
          }, '*');
        } catch (e) {}
      }

      // --- AQUÍ ESTÁ LA MAGIA INYECTADA CON SEGURIDAD ---
      if (msg.type === actionType && roomCode && !isUpdatingRef.current) {
        if (!isMyTurn) return;
        isUpdatingRef.current = true;
        try {
          const latest = await getSession(roomCode);
          const action = { ...extractAction(msg), player: playerIndexRef.current };
          const actions = [...(latest.game_state?.actions || []), action];
          
          // Calculamos el turno localmente para decirle al servidor a quién le toca
          let nextTurn = playerIndexRef.current; 
          
          // Si el juego NO manda "keepTurn: true", avanzamos el turno
          if (!msg.keepTurn) {
              const totalPlayers = latest.participants?.length || 2;
              nextTurn = (playerIndexRef.current + 1) % totalPlayers;
          }

          // Enviamos al servidor la jugada Y a quién le toca ahora
          await updateSession(roomCode, { 
              game_state: { actions },
              current_turn: String(nextTurn)
          });
          
          // Solo bloqueamos nuestra pantalla si hemos pasado el turno
          if (!msg.keepTurn) {
              setIsMyTurn(false);
              iframeRef.current?.contentWindow?.postMessage({ type: 'UPDATE_TURN', isMyTurn: false }, '*');
          }
        } catch (e) {} finally { isUpdatingRef.current = false; }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isPlaying, user, roomCode, isMyTurn, actionType]);

  // 3. POLLING (El vigilante que detecta el Caballo de Troya)
  useEffect(() => {
    if (!isPlaying || !roomCode) return;

    const poll = async () => {
      if (isUpdatingRef.current) return;

      try {
        const latest = await getSession(roomCode);
        if (!latest || latest.error) throw new Error("Sala muerta");

        const actions = latest.game_state?.actions || [];
        
        if (actions.some(a => a.type === 'ABANDON')) {
          throw new Error("El otro jugador huyó");
        }

        const turnStatus = (String(latest.current_turn) === String(playerIndexRef.current));
        if (turnStatus !== isMyTurn) {
          setIsMyTurn(turnStatus);
          iframeRef.current?.contentWindow?.postMessage({ type: 'UPDATE_TURN', isMyTurn: turnStatus }, '*');
        }

        if (playerIndexRef.current === 0 && latest.status === 'playing' && !hostNotifiedRef.current) {
            hostNotifiedRef.current = true;
            onHostGameStart?.(latest, iframeRef, user);
        }

        const newMoves = [];
        for (let i = lastDeliveredIdxRef.current + 1; i < actions.length; i++) {
          const act = actions[i];
          if (String(act.player) !== String(playerIndexRef.current) && act.type !== 'ABANDON') {
            iframeRef.current?.contentWindow?.postMessage(buildOpponentMessage(act), '*');
          }
          if (formatMoveLabel && act.type !== 'ABANDON') {
            const p = latest.participants?.[act.player];
            newMoves.push({ move: formatMoveLabel(act), player: p ? (p.name || p.email.split('@')[0]) : `Jugador ${act.player}` });
          }
          lastDeliveredIdxRef.current = i;
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
  }, [isPlaying, roomCode, isMyTurn]);

  return { moveHistory, roomCode, isMyTurn };
}