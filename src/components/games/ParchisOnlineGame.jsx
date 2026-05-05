import React, { useRef, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTurnGameRelay } from '@/hooks/useTurnGameRelay';
import OnlineGameLobby from "@/components/games/OnlineGameLobby";
import { Copy, Flag, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { getSession, getSessionPlayers, updateMyPlayerStatus, updateSession, deleteSession } from '@/api/sessions';
import { joinQueue, getMatchStatus, cancelSearch } from '@/api/matchmaking';
import { useCurrentRoom } from '@/lib/CurrentRoomContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Utilidad para mostrar el nombre limpio
const nickName = (name) => {
  if (!name) return "Jugador";
  if (name.includes('@')) return name.split('@')[0];
  return name;
};

// Mapeo de colores y brillos para las tarjetas de los jugadores
const teamStyles = {
  rojo: { border: "border-red-500", shadow: "shadow-[0_0_15px_rgba(239,68,68,0.4)]", text: "text-red-500", bg: "bg-red-500" },
  azul: { border: "border-blue-500", shadow: "shadow-[0_0_15px_rgba(59,130,246,0.4)]", text: "text-blue-500", bg: "bg-blue-500" },
  amarillo: { border: "border-yellow-400", shadow: "shadow-[0_0_15px_rgba(250,204,21,0.4)]", text: "text-yellow-400", bg: "bg-yellow-400" },
  verde: { border: "border-green-500", shadow: "shadow-[0_0_15px_rgba(34,197,94,0.4)]", text: "text-green-500", bg: "bg-green-500" },
  default: { border: "border-white/10", shadow: "", text: "text-white" }
};

const SEAT_COLOR_NAMES = ['rojo', 'azul', 'amarillo', 'verde'];

export default function ParchisOnlineGame({ isPlaying, user, gameId, onRoomCodeChange, onMoveHistoryChange, onScoreUpdate, initialRoomCode, onLeave, myEloRating = 1200 }) {
  const [screen, setScreen] = useState("lobby");
  const [joinCode, setJoinCode] = useState("");

  // Estados de React para la nueva interfaz superior
  const [myColorState, setMyColorState] = useState(null);
  const [isMyTurnState, setIsMyTurnState] = useState(false);
  const [roomCodeState, setRoomCodeState] = useState("");
  const [currentTurnSeat, setCurrentTurnSeat] = useState(null);
  const [moveHistoryState, setMoveHistoryState] = useState([]);
  const [leaveOpen, setLeaveOpen] = useState(false);

  // Sala de espera
  const [sessionPlayers, setSessionPlayers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [searchError, setSearchError] = useState('');

  // ESTADO P2P: Guarda los nombres dictados directamente por la red
  const [playerNames, setPlayerNames] = useState({});

  // Array ref para ir guardando el historial de forma local
  const localLogsRef = useRef([]);
  const userRef = useRef(user);
  const myColorRef = useRef(null);
  const closeHandledRef = useRef(false);
  const leavingRef = useRef(false);

  const isHostRef = useRef(false);
  const didAwardRef = useRef(false);
  const searchTimerRef = useRef(null);
  const matchPollRef = useRef(null);

  const { setCurrentRoom, clearCurrentRoom } = useCurrentRoom();
  const queryClient = useQueryClient();

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    myColorRef.current = myColorState;
  }, [myColorState]);

  // Refs para que el EventListener de VanillaJS pueda actualizar React
  const onMoveHistoryChangeRef = useRef(onMoveHistoryChange);
  const setMyColorStateRef = useRef(null);
  const setIsMyTurnStateRef = useRef(null);
  const setRoomCodeStateRef = useRef(null);

  useEffect(() => {
    onMoveHistoryChangeRef.current = onMoveHistoryChange;
    setMyColorStateRef.current = setMyColorState;
    setIsMyTurnStateRef.current = setIsMyTurnState;
    setRoomCodeStateRef.current = setRoomCodeState;
  }, [onMoveHistoryChange]);

  // Simulamos la referencia al iframe para que useTurnGameRelay use la misma ventana actual
  const mockIframeRef = useRef({
    contentWindow: typeof window !== 'undefined' ? window : null
  });

  const { roomCode } = useTurnGameRelay({
    isPlaying,
    user,
    gameId,
    iframeRef: mockIframeRef,
    onRoomCodeChange,
    actionType: 'PARCHIS_MOVE',
    extractAction: (msg) => ({
      piece: msg.piece,
      to: msg.to,
      dice: msg.dice,
      color: msg.color,
      progress: msg.progress,
      eaten: msg.eaten,
      eatenColor: msg.eatenColor,
      keepTurn: msg.keepTurn,
      isThirdSix: msg.isThirdSix,
      openedBarrier: msg.openedBarrier,
      playerName: msg.playerName
    }),
    buildOpponentMessage: (action) => ({
      type: 'OPPONENT_MOVED',
      ...action
    }),
    minPlayers: 2,
    maxPlayers: 4,
    enforceTurns: true,
    waitForStart: true,
    manualStart: true,
    replayPastActions: true,
    closeOnAbandon: false,
    onGameStarted: () => setScreen("playing"),
  });

  // Sync roomCode from relay → local state + chat
  useEffect(() => {
    if (roomCode) {
      setRoomCodeState(roomCode);
    }
  }, [roomCode]);

  // CurrentRoomContext: expose room so FloatingChat invite button works
  useEffect(() => {
    if (roomCodeState) setCurrentRoom({ roomCode: roomCodeState, gameId, gameTitle: 'Parchís Online' });
    else clearCurrentRoom();
  }, [roomCodeState]); // eslint-disable-line
  useEffect(() => () => clearCurrentRoom(), []); // eslint-disable-line

  useEffect(() => {
    if (screen === 'playing') {
      clearCurrentRoom();
    }
  }, [screen, clearCurrentRoom]);

  useEffect(() => {
    onMoveHistoryChange?.(moveHistoryState);
  }, [moveHistoryState, onMoveHistoryChange]);

  // Auto-join when arriving via ?room= or game invite notification
  useEffect(() => {
    if (!initialRoomCode || !user || !isPlaying || screen !== 'lobby') return;
    handleJoinRoom(initialRoomCode);
  }, [initialRoomCode, user, isPlaying]); // eslint-disable-line

  // Poll players + session status while in the waiting lobby
  useEffect(() => {
    if (screen !== 'waiting' || !roomCodeState) return;
    const poll = async () => {
      if (leavingRef.current) return;
      try {
        const [session, players] = await Promise.all([
          getSession(roomCodeState),
          getSessionPlayers(roomCodeState),
        ]);
        const activePlayers = players
          .filter(player => player.status === 'active')
          .sort((a, b) => a.seat - b.seat);
        setSessionPlayers(activePlayers);
        setCurrentTurnSeat(Number.isFinite(Number(session?.current_turn)) ? Number(session.current_turn) : null);

        // Populate player name map from DB (fixes "can't see each other" bug)
        const names = {};
        activePlayers.forEach(p => {
          const color = SEAT_COLOR_NAMES[p.seat];
          if (color) names[color] = nickName(p.user_name);
        });
        setPlayerNames(names);
        syncMyColorFromPlayers(activePlayers);
        if (session?.status === 'playing') setScreen('playing');
      } catch { /* silencioso */ }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [screen, roomCodeState]);

  const stopSearching = () => {
    setIsSearching(false);
    setSearchSeconds(0);
    if (searchTimerRef.current) { clearInterval(searchTimerRef.current); searchTimerRef.current = null; }
    if (matchPollRef.current) { clearInterval(matchPollRef.current); matchPollRef.current = null; }
  };
  useEffect(() => () => stopSearching(), []); // eslint-disable-line

  const syncMyColorFromPlayers = (players) => {
    const myPlayer = players.find(player => player.user_email === user?.email);
    const derivedColor = myPlayer ? SEAT_COLOR_NAMES[myPlayer.seat] : null;
    if (derivedColor && myColorRef.current !== derivedColor) {
      myColorRef.current = derivedColor;
      setMyColorState(derivedColor);
    }
    return derivedColor;
  };

  const resetLocal = () => {
    stopSearching();
    clearCurrentRoom();
    setScreen('lobby');
    setJoinCode('');
    setRoomCodeState('');
    setSessionPlayers([]);
    setCurrentTurnSeat(null);
    setMyColorState(null);
    myColorRef.current = null;
    setIsMyTurnState(false);
    setPlayerNames({});
    setLeaveOpen(false);
    localLogsRef.current = [];
    setMoveHistoryState([]);
    onRoomCodeChange?.(null);
    queryClient.invalidateQueries({ queryKey: ['myActiveSessions'] });
  };

  const leaveGameView = () => {
    resetLocal();
    onLeave?.();
  };

  const resolveFinishedSession = (session, activePlayers) => {
    if (didAwardRef.current) return;
    didAwardRef.current = true;

    if (session?.winner && session.winner === user?.email) {
      window.parent.postMessage({ type: 'SCORE_UPDATE', score: 1 }, '*');
      window.parent.postMessage({ type: 'GAME_OVER', score: 1 }, '*');
      onScoreUpdate?.(1);
      toast.success('Has ganado por abandono.');
      return;
    }

    if (session?.winner) {
      window.parent.postMessage({ type: 'SCORE_UPDATE', score: 0 }, '*');
      window.parent.postMessage({ type: 'GAME_OVER', score: 0 }, '*');
      onScoreUpdate?.(0);
      const winnerPlayer = activePlayers.find(player => player.user_email === session.winner);
      toast.info(winnerPlayer ? `Ha ganado ${nickName(winnerPlayer.user_name)}.` : 'La partida ha terminado.');
      return;
    }

    toast.info('La partida ha terminado.');
  };

  useEffect(() => {
    if (screen !== 'lobby') return;
    setCurrentTurnSeat(null);
    myColorRef.current = null;
    localLogsRef.current = [];
    setMoveHistoryState([]);
    didAwardRef.current = false;
    closeHandledRef.current = false;
    leavingRef.current = false;
  }, [screen]);

  const handleCreateRoom = () => {
    isHostRef.current = true;
    setScreen("waiting");
    setTimeout(() => {
      window.postMessage({ type: 'CREATE_ROOM' }, '*');
    }, 100);
  };

  const handleJoinRoom = (code) => {
    const cleanCode = code.trim().toUpperCase();
    isHostRef.current = false;
    setScreen("waiting");
    setTimeout(() => {
      setRoomCodeState(cleanCode);
      window.postMessage({ type: 'JOIN_ROOM', code: cleanCode }, '*');
    }, 100);
  };

  const autoJoinMatchmaking = (matchRoomCode, role) => {
    isHostRef.current = role === 'host';
    setScreen('waiting');
    setRoomCodeState(matchRoomCode);
    setTimeout(() => {
      window.postMessage({ type: 'JOIN_ROOM', code: matchRoomCode }, '*');
    }, 100);
  };

  useEffect(() => {
    if (screen === 'playing' && roomCodeState) {
      onRoomCodeChange?.(roomCodeState);
    }
  }, [screen, roomCodeState, onRoomCodeChange]);

  useEffect(() => {
    if (screen !== 'playing' || !roomCodeState) return;
    closeHandledRef.current = false;

    const poll = async () => {
      try {
        const [session, players] = await Promise.all([
          getSession(roomCodeState),
          getSessionPlayers(roomCodeState),
        ]);

        const activePlayers = players
          .filter(player => player.status === 'active')
          .sort((a, b) => a.seat - b.seat);

        setSessionPlayers(activePlayers);
        setCurrentTurnSeat(Number.isFinite(Number(session?.current_turn)) ? Number(session.current_turn) : null);

        const names = {};
        activePlayers.forEach(player => {
          const color = SEAT_COLOR_NAMES[player.seat];
          if (color) names[color] = nickName(player.user_name);
        });
        setPlayerNames(names);
        syncMyColorFromPlayers(activePlayers);

        if (session?.status === 'finished' && !closeHandledRef.current) {
          closeHandledRef.current = true;
          resolveFinishedSession(session, activePlayers);
          leaveGameView();
        }
      } catch {
        if (!closeHandledRef.current && !leavingRef.current) {
          closeHandledRef.current = true;
          toast.error('La partida ya no está disponible.');
          leaveGameView();
        }
      }
    };

    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [onLeave, onRoomCodeChange, roomCodeState, screen, onScoreUpdate]);

  const handleConfirmLeave = async () => {
    setLeaveOpen(false);
    if (leavingRef.current) return;
    leavingRef.current = true;
    closeHandledRef.current = true;

    if (!roomCodeState) {
      leaveGameView();
      return;
    }

    try {
      const [session, players] = await Promise.all([
        getSession(roomCodeState),
        getSessionPlayers(roomCodeState),
      ]);
      const me = players.find(player => player.user_email === user?.email);
      const otherActivePlayers = players
        .filter(player => player.status === 'active' && player.user_email !== user?.email)
        .sort((a, b) => a.seat - b.seat);

      await updateMyPlayerStatus(roomCodeState, 'left').catch(() => {});

      if (session?.status === 'waiting') {
        if (otherActivePlayers.length === 0) {
          await deleteSession(roomCodeState).catch(() => {});
        }
      } else if (session?.status === 'playing') {
        if (otherActivePlayers.length <= 1) {
          await updateSession(roomCodeState, {
            status: 'finished',
            winner: otherActivePlayers.length === 1 ? otherActivePlayers[0].user_email : null,
          }).catch(() => {});
        } else if (String(session.current_turn) === String(me?.seat)) {
          const nextPlayer = otherActivePlayers.find(player => player.seat > (me?.seat ?? -1)) || otherActivePlayers[0];
          if (nextPlayer) {
            await updateSession(roomCodeState, { current_turn: String(nextPlayer.seat) }).catch(() => {});
          }
        }
      }
    } catch {
      // Si falla, igualmente limpiamos localmente.
    }

    toast.message('Has abandonado la partida.');
    leaveGameView();
  };

  const handleFindMatch = async (mode = 'normal') => {
    if (!user) return;
    setIsSearching(true);
    setSearchSeconds(0);
    setSearchError('');
    searchTimerRef.current = setInterval(() => setSearchSeconds(s => s + 1), 1000);
    try {
      const result = await joinQueue(gameId, mode, myEloRating ?? 1200);
      if (result.status === 'matched') {
        stopSearching();
        autoJoinMatchmaking(result.room_code, result.role);
        return;
      }
      matchPollRef.current = setInterval(async () => {
        try {
          const status = await getMatchStatus();
          if (status.status === 'matched') {
            stopSearching();
            autoJoinMatchmaking(status.room_code, status.role);
          } else if (status.status === 'timeout' || status.status === 'not_in_queue') {
            stopSearching();
            setSearchError('Tiempo de búsqueda agotado. Inténtalo de nuevo.');
          }
        } catch { /* silencioso */ }
      }, 2000);
    } catch (e) {
      stopSearching();
      setSearchError(e?.message || 'Error al buscar partida');
    }
  };

  const handleStartGame = async () => {
    if (!roomCodeState) return;
    try {
      await updateSession(roomCodeState, { status: 'playing' });
    } catch {
      toast.error('No se pudo iniciar la partida');
    }
  };

  // Lógica principal de Vanilla JS integrada directamente en React
  useEffect(() => {
    if (screen !== "playing") return; 

    const board = document.getElementById('board');
    if (!board || board.dataset.initialized) return;
    board.dataset.initialized = "true";

    // --- 1. GEOMETRÍA EXACTA DEL TABLERO ---
    const pathCoords = [
        {c:9,r:14},{c:9,r:13},{c:9,r:12},{c:9,r:11},{c:9,r:10}, {c:10,r:9},{c:11,r:9},{c:12,r:9},{c:13,r:9},{c:14,r:9},{c:15,r:9}, {c:15,r:8},{c:15,r:7},
        {c:14,r:7},{c:13,r:7},{c:12,r:7},{c:11,r:7},{c:10,r:7}, {c:9,r:6},{c:9,r:5},{c:9,r:4},{c:9,r:3},{c:9,r:2},{c:9,r:1}, {c:8,r:1},{c:7,r:1},
        {c:7,r:2},{c:7,r:3},{c:7,r:4},{c:7,r:5},{c:7,r:6}, {c:6,r:7},{c:5,r:7},{c:4,r:7},{c:3,r:7},{c:2,r:7},{c:1,r:7}, {c:1,r:8},{c:1,r:9},
        {c:2,r:9},{c:3,r:9},{c:4,r:9},{c:5,r:9},{c:6,r:9}, {c:7,r:10},{c:7,r:11},{c:7,r:12},{c:7,r:13},{c:7,r:14},{c:7,r:15}, {c:8,r:15},{c:9,r:15}
    ];
    
    const metaPaths = {
        amarillo: [{c:8,r:14},{c:8,r:13},{c:8,r:12},{c:8,r:11},{c:8,r:10}],
        azul: [{c:14,r:8},{c:13,r:8},{c:12,r:8},{c:11,r:8},{c:10,r:8}],
        verde: [{c:8,r:2},{c:8,r:3},{c:8,r:4},{c:8,r:5},{c:8,r:6}],
        rojo: [{c:2,r:8},{c:3,r:8},{c:4,r:8},{c:5,r:8},{c:6,r:8}]
    };

    const offsets = { 'amarillo': 0, 'azul': 13, 'verde': 26, 'rojo': 39 };
    const safeZones = [0, 8, 13, 21, 26, 34, 39, 47]; 

    let gameState = {
        rojo: [ {id: 'r0', progress: -1}, {id: 'r1', progress: -1}, {id: 'r2', progress: -1}, {id: 'r3', progress: -1} ],
        verde: [ {id: 'v0', progress: -1}, {id: 'v1', progress: -1}, {id: 'v2', progress: -1}, {id: 'v3', progress: -1} ],
        azul: [ {id: 'a0', progress: -1}, {id: 'a1', progress: -1}, {id: 'a2', progress: -1}, {id: 'a3', progress: -1} ],
        amarillo: [ {id: 'y0', progress: -1}, {id: 'y1', progress: -1}, {id: 'y2', progress: -1}, {id: 'y3', progress: -1} ]
    };

    let myColor = null;
    let isMyTurn = false;
    let currentDice = 0;
    let bonusMoves = 0; 
    
    let consecutiveSixes = 0;
    let lastMovedPieceId = null;
    let isRolling = false; 

    function getOwnColor() {
        return myColorRef.current || myColor || null;
    }

    function hasPiecesAtHome(color = getOwnColor()) {
        return Boolean(color && gameState[color]?.some(ficha => ficha.progress === -1));
    }

    function getDiceMoveValue(color = getOwnColor()) {
        if (bonusMoves > 0) return bonusMoves;
        if (currentDice === 6 && color && !hasPiecesAtHome(color)) return 7;
        return currentDice;
    }

    function isBarrier(occupancy) {
        return occupancy.count === 2
            && occupancy.fichas[0]
            && occupancy.fichas.every(ficha => ficha.color === occupancy.fichas[0].color);
    }

    function setDiceResult(message, tone = '#fde047') {
        const diceRes = document.getElementById('diceResult');
        if (!diceRes) return;
        diceRes.innerHTML = message;
        diceRes.style.color = tone;
    }

    // --- 2. DIBUJAR EL TABLERO ---
    const cellsDOM = {}; 

    pathCoords.forEach((coord, i) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.gridColumn = coord.c;
        cell.style.gridRow = coord.r;
        cell.id = `cell-${i}`;
        
        if(i === 0) cell.style.border = "2px solid #eab308"; 
        if(i === 13) cell.style.border = "2px solid #3b82f6";
        if(i === 26) cell.style.border = "2px solid #22c55e";
        if(i === 39) cell.style.border = "2px solid #ef4444";
        
        if(safeZones.includes(i)) {
            cell.classList.add('safe-zone');
            cell.innerHTML = '<span style="position: absolute; opacity: 0.5;">⭐</span>'; 
        }

        board.appendChild(cell);
        cellsDOM[cell.id] = cell;
    });

    ['verde', 'azul', 'amarillo', 'rojo'].forEach(color => {
        metaPaths[color].forEach((coord, step) => {
            const cell = document.createElement('div');
            cell.className = `cell path-${color}`;
            cell.style.gridColumn = coord.c;
            cell.style.gridRow = coord.r;
            cell.id = `path-${color}-${step + 1}`; 
            board.appendChild(cell);
            cellsDOM[cell.id] = cell;
        });
    });

    function getCellId(color, progress) {
        if (progress === -1) return `home-${color}`;
        if (progress === 56) return `meta`;
        if (progress >= 0 && progress <= 50) return `cell-${(offsets[color] + progress) % 52}`;
        return `path-${color}-${progress - 50}`; 
    }

    // Crear Fichas
    ['rojo', 'verde', 'azul', 'amarillo'].forEach(color => {
        gameState[color].forEach(ficha => {
            const el = document.createElement('div');
            el.className = `token ${color}`;
            el.id = ficha.id;
            el.onclick = () => intentarMoverFicha(ficha.id, color);
            document.getElementById(`home-${color}`).appendChild(el);
        });
    });

    // Evento de dado
    document.getElementById('dice').onclick = tirarDado;

    // --- 3. LÓGICA CENTRAL DE BARRERAS Y MOVIMIENTOS ---
    function countFichasEnCasilla(posAbs) {
        let count = 0;
        let fichas = [];
        ['rojo', 'verde', 'azul', 'amarillo'].forEach(c => {
            gameState[c].forEach(f => {
                if (f.progress >= 0 && f.progress <= 50 && ((offsets[c] + f.progress) % 52) === posAbs) {
                    count++;
                    fichas.push({id: f.id, color: c});
                }
            });
        });
        return { count, fichas };
    }

    function getMoveInfo(ficha, moveValue) {
        const playerColor = getOwnColor();
        if (!playerColor) return null;

        if (ficha.progress === -1) {
            if (moveValue !== 5) return null;
            let posAbs = offsets[playerColor];
            let occ = countFichasEnCasilla(posAbs);

            if (occ.count < 2) return { type: 'exit', target: 0, eatenId: null };
            if (occ.count === 2) {
                const rival = occ.fichas.find(f => f.color !== playerColor);
                if (rival) return { type: 'exit', target: 0, eatenId: rival.id };
                return null;
            }
            return null;
        }

        let target = ficha.progress + moveValue;
        if (target > 56) return null; 

        if (target >= 0 && target <= 50) {
            let posAbs = (offsets[playerColor] + target) % 52;
            let occ = countFichasEnCasilla(posAbs);
            if (occ.count >= 2) return null; 
        } else if (target > 50 && target < 56) {
            let count = gameState[playerColor].filter(f => f.progress === target).length;
            if (count >= 2) return null; 
        }

        for (let p = ficha.progress + 1; p < target; p++) {
            if (p <= 50) {
                let posAbs = (offsets[playerColor] + p) % 52;
                let occ = countFichasEnCasilla(posAbs);
                if (isBarrier(occ)) {
                    return null; 
                }
            }
        }

        let isCapture = false;
        let eatenId = null;
        if (target >= 0 && target <= 50) {
            let posAbs = (offsets[playerColor] + target) % 52;
            if (!safeZones.includes(posAbs)) {
                let occ = countFichasEnCasilla(posAbs);
                if (occ.count === 1 && occ.fichas[0].color !== playerColor) {
                    isCapture = true;
                    eatenId = occ.fichas[0].id;
                }
            }
        }

        if (target === 56) return { type: 'meta', target: 56, eatenId: null };
        if (isCapture) return { type: 'capture', target: target, eatenId: eatenId };
        return { type: 'normal', target: target, eatenId: null };
    }

    function tirarDado() {
        if (!isMyTurn || currentDice > 0 || bonusMoves > 0 || isRolling) return;
        
        isRolling = true;
        const diceEl = document.getElementById('dice');
        diceEl.style.transform = "rotate(360deg)";
        
        setTimeout(() => {
            isRolling = false;
            diceEl.style.transform = "rotate(0deg)";
            const playerColor = getOwnColor();
            currentDice = Math.floor(Math.random() * 6) + 1;
            const effectiveDice = currentDice === 6 && playerColor && !hasPiecesAtHome(playerColor) ? 7 : currentDice;
            document.getElementById('diceResult').innerText = `🎲 ${currentDice}`;
            log(effectiveDice === currentDice ? `Tiras un ${currentDice}.` : `Tiras un ${currentDice} y cuentas ${effectiveDice}.`);
            setDiceResult(
                effectiveDice === currentDice
                    ? `🎲 ${currentDice}`
                    : `🎲 ${currentDice}<div style="font-size:0.95rem; font-weight:700; margin-top:4px;">Cuenta ${effectiveDice}</div>`
            );
            
            if (currentDice === 6) {
                consecutiveSixes++;
            } else {
                consecutiveSixes = 0;
            }

            if (consecutiveSixes === 3) {
                let savedDice = currentDice; 
                if (lastMovedPieceId) {
                    const f = playerColor ? gameState[playerColor].find(x => x.id === lastMovedPieceId) : null;
                    if (f && f.progress >= 0 && f.progress <= 50) {
                        log(`¡Tres 6 seguidos! Ficha a casa.`); // REGISTRO DE CASTIGO
                        f.progress = -1;
                        actualizarTableroVisual(f.id, playerColor, -1, null, null);
                        enviarJugada(f.id, -1, null, null, false, savedDice, true);
                    } else {
                        log(`¡Tres 6 seguidos! Pierdes turno (Ficha a salvo).`);
                        enviarJugada(null, null, null, null, false, savedDice, true);
                    }
                } else {
                    log(`¡Tres 6 seguidos! Pierdes turno.`);
                    enviarJugada(null, null, null, null, false, savedDice, true);
                }
                
                consecutiveSixes = 0;
                currentDice = 0;
                bonusMoves = 0;
                return; 
            }

            evaluarMovimientosPosibles();
        }, 300);
    }

    function evaluarMovimientosPosibles() {
        const playerColor = getOwnColor();
        let moveValue = getDiceMoveValue(playerColor);
        let possibleMoves = [];
        const myPieces = playerColor ? gameState[playerColor] : null;

        if (!playerColor || !Array.isArray(myPieces)) {
            setDiceResult('Sincronizando tu color...', '#fca5a5');
            return;
        }

        myPieces.forEach(ficha => {
            let moveInfo = getMoveInfo(ficha, moveValue);
            if (moveInfo) {
                let inBarrier = false;
                if (ficha.progress >= 0 && ficha.progress < 56) {
                    let misFichasAqui = myPieces.filter(f2 => f2.progress === ficha.progress).length;
                    if (misFichasAqui === 2) inBarrier = true;
                }
                possibleMoves.push({ ficha, info: moveInfo, inBarrier });
            }
        });

        let filteredMoves = [];
        let exits = possibleMoves.filter(m => m.info.type === 'exit');
        let barrierOpeners = possibleMoves.filter(m => m.inBarrier);
        let captures = possibleMoves.filter(m => m.info.type === 'capture');

        if (moveValue === 5 && exits.length > 0) {
            filteredMoves = exits; 
        } else if (currentDice === 6 && bonusMoves === 0 && barrierOpeners.length > 0) {
            filteredMoves = barrierOpeners;
            log(`¡Obligatorio abrir barrera con el 6!`); // REGISTRO DE AVISO OBLIGATORIO
        } else if (captures.length > 0) {
            filteredMoves = captures;
        } else {
            filteredMoves = possibleMoves;
        }

        if (filteredMoves.length === 0) {
            let hadSix = (currentDice === 6 && bonusMoves === 0);
            let savedDice = currentDice;
            const moveLabel = bonusMoves > 0 || moveValue === currentDice ? `${moveValue}` : `${currentDice} (cuenta ${moveValue})`;
            
            // REGISTROS RICOS SI NO HAY MOVIMIENTOS
            if (bonusMoves > 0) {
                log(`No puedes contar las ${bonusMoves}. Pasas turno.`);
            } else if (currentDice > 0) {
                if (hadSix) log(`Sin movimientos con el ${moveLabel}. Tiras de nuevo.`);
                else log(`Sin movimientos con el ${moveLabel}. Pasas turno.`);
            }
            
            bonusMoves = 0;
            currentDice = 0;
            
            setTimeout(() => {
                enviarJugada(null, null, null, null, hadSix, savedDice, false);
                
                if (hadSix) {
                    const diceEl = document.getElementById('dice');
                    if (diceEl) diceEl.classList.remove('disabled');
                    setDiceResult('¡Tira de nuevo!');
                }
            }, 1500); 
        } else {
            filteredMoves.forEach(m => {
                document.getElementById(m.ficha.id).classList.add('movable');
            });
        }
    }

    function intentarMoverFicha(fichaId, colorFicha) {
        const playerColor = getOwnColor();
        if (!isMyTurn || (currentDice === 0 && bonusMoves === 0) || colorFicha !== playerColor) return;
        const el = document.getElementById(fichaId);
        if (!el.classList.contains('movable')) return;

        document.querySelectorAll('.movable').forEach(e => e.classList.remove('movable'));
        lastMovedPieceId = fichaId;

        const ficha = gameState[playerColor].find(f => f.id === fichaId);
        let moveValue = getDiceMoveValue(playerColor);
        
        // COMPROBAR SI ACABA DE ABRIR UNA BARRERA PARA COMUNICARLO
        let wasBarrierOpen = false;
        if (currentDice === 6 && bonusMoves === 0) {
            let misFichasAqui = gameState[playerColor].filter(f2 => f2.progress === ficha.progress).length;
            if (misFichasAqui === 2) wasBarrierOpen = true;
        }

        let moveInfo = getMoveInfo(ficha, moveValue);
        if (!moveInfo) return; 

        let nuevoProgreso = moveInfo.target;
        let comidaId = moveInfo.eatenId;
        let comidaColor = null;

        if (comidaId) {
            const coloresRivales = ['rojo', 'verde', 'azul', 'amarillo'].filter(c => c !== playerColor);
            for (let c of coloresRivales) {
                if (gameState[c].find(f => f.id === comidaId)) {
                    comidaColor = c; break;
                }
            }
        }

        actualizarTableroVisual(fichaId, playerColor, nuevoProgreso, comidaId, comidaColor);

        let earnedBonus = 0;
        let localLogMsg = `Mueves ficha.`; // LOG BASE

        // ENRIQUECEMOS EL LOG LOCAL DE LA JUGADA
        if (comidaId && comidaColor) {
            earnedBonus = 20; 
            localLogMsg = `¡Te comes una ficha ${comidaColor.toUpperCase()}! Cuentas 20.`;
        } else if (nuevoProgreso === 56) {
            earnedBonus = 10; 
            localLogMsg = `¡Ficha en la meta! Cuentas 10.`;
        } else if (wasBarrierOpen) {
            localLogMsg = `Abres barrera por obligación del 6.`;
        }
        
        log(localLogMsg);

        let usedBonus = (bonusMoves > 0);
        let hadSix = (!usedBonus && currentDice === 6); 
        
        let savedDice = currentDice;

        if (usedBonus) bonusMoves = 0; else currentDice = 0;
        if (earnedBonus > 0) bonusMoves = earnedBonus;

        let keepsTurn = (bonusMoves > 0 || hadSix);

        enviarJugada(fichaId, nuevoProgreso, comidaId, comidaColor, keepsTurn, savedDice, false, wasBarrierOpen);

        if (keepsTurn) {
            if (bonusMoves > 0) {
                setDiceResult(`⭐ ¡Premio de ${bonusMoves}!`);
                evaluarMovimientosPosibles();
            } else {
                setDiceResult('¡Tira de nuevo!');
                document.getElementById('dice').classList.remove('disabled');
            }
        }

        const allInMeta = gameState[playerColor].every(f => f.progress === 56);
        if (allInMeta) {
            setTimeout(() => {
                if (!didAwardRef.current) {
                    didAwardRef.current = true;
                    // LÓGICA DE VICTORIA BASADA EN LA API DE INTEGRACIÓN PARA TERCEROS 🔴
                    window.parent.postMessage({ type: 'SCORE_UPDATE', score: 1 }, '*');
                    window.parent.postMessage({ type: 'GAME_OVER', score: 1 }, '*');
                    onScoreUpdate?.(1); // Mantenemos el callback por si se ejecuta dentro del entorno local
                    toast.success("¡Victoria! +1 punto");
                    
                    window.postMessage({ type: 'PARCHIS_WIN', color: playerColor }, '*');
                }
            }, 500);
        }
    }

    // --- 4. MOTOR VISUAL Y DE RED ---
    function actualizarTableroVisual(fichaId, color, nuevoProgreso, idComida, colorComida) {
        const fichaObj = gameState[color].find(f => f.id === fichaId);
        if(fichaObj) fichaObj.progress = nuevoProgreso;
        
        const tokenEl = document.getElementById(fichaId);
        const targetCell = document.getElementById(getCellId(color, nuevoProgreso));
        
        if (tokenEl && targetCell) {
            targetCell.appendChild(tokenEl); 
        }

        if (idComida && colorComida) {
            const comidaObj = gameState[colorComida].find(f => f.id === idComida);
            if(comidaObj) {
                comidaObj.progress = -1;
                
                const comidaEl = document.getElementById(idComida);
                const homeDest = document.getElementById(`home-${colorComida}`);
                
                if (comidaEl && homeDest) {
                    homeDest.appendChild(comidaEl); 
                }
            }
        }
    }

    function enviarJugada(fichaId, nuevoProgreso, comidaId, colorComida, mantieneTurno, overrideDice = null, isThirdSix = false, openedBarrier = false) {
        const playerColor = getOwnColor();
        if (!playerColor) return;
        let diceToSend = overrideDice !== null ? overrideDice : currentDice;
        
        const currentName = userRef.current ? (nickName(userRef.current.full_name) || userRef.current.email?.split('@')[0]) : "Jugador";

        window.postMessage({
            type: 'PARCHIS_MOVE',
            piece: fichaId,
            color: playerColor, 
            progress: nuevoProgreso !== null ? nuevoProgreso.toString() : null,
            to: nuevoProgreso !== null ? nuevoProgreso.toString() : null, 
            dice: diceToSend, 
            eaten: comidaId,
            eatenColor: colorComida,
            keepTurn: mantieneTurno,
            isThirdSix: isThirdSix,
            openedBarrier: openedBarrier, // INCRUSTAMOS SI ABRIÓ BARRERA EN LA RED
            playerName: currentName
        }, '*');
        
        if (!mantieneTurno) {
            currentDice = 0; bonusMoves = 0;
            setDiceResult('&nbsp;', '#94a3b8');
        }
    }

    const handleMessage = (e) => {
        const m = e.data;
        if (!m || typeof m !== 'object') return;

        if (m.type === 'ROOM_CREATED') {
            if (m.code) {
                setRoomCodeStateRef.current?.(m.code);
            }
        }
        
        if (m.type === 'ASSIGN_COLOR') { 
            myColor = m.color; 
            myColorRef.current = m.color;
            setMyColorStateRef.current?.(m.color);
        }

        if (m.type === 'UPDATE_TURN') {
            isMyTurn = m.isMyTurn;
            setIsMyTurnStateRef.current?.(m.isMyTurn);
            
            const diceEl = document.getElementById('dice');
            if (isMyTurn) {
                diceEl.classList.remove('disabled');
                currentDice = 0; 
                bonusMoves = 0;
                consecutiveSixes = 0; 
            } else {
                diceEl.classList.add('disabled');
            }
        }

        if (m.type === 'OPPONENT_MOVED') {
            const isReplay = !!m.replay;
            
            // INTERCEPTOR: Guardamos el nombre que viaja en la jugada
            if (m.color && m.playerName) {
                setPlayerNames(prev => {
                    if (prev[m.color] !== m.playerName) {
                        return { ...prev, [m.color]: m.playerName };
                    }
                    return prev;
                });
            }

            let moveColor = m.color;
            
            if (!moveColor && m.piece) {
                if (m.piece.startsWith('r')) moveColor = 'rojo';
                else if (m.piece.startsWith('v')) moveColor = 'verde';
                else if (m.piece.startsWith('a')) moveColor = 'azul';
                else if (m.piece.startsWith('y')) moveColor = 'amarillo';
            }
            
            if (!moveColor) return; 

            // LOG DE TIRADA DE OPONENTE
            if (!isReplay && m.dice && m.dice > 0 && (!m.piece || !m.isThirdSix)) {
                log(`${moveColor.toUpperCase()} tira un ${m.dice}.`);
            }

            // LOG DE CASTIGO DE OPONENTE (CORREGIDO)
            if (!isReplay && m.isThirdSix) {
                if (m.to === -1 || m.to === "-1") {
                    log(`¡${moveColor.toUpperCase()} saca tres 6! Ficha a casa.`);
                } else {
                    log(`¡${moveColor.toUpperCase()} saca tres 6! Pierde turno.`);
                }
            }
            
            if (m.piece) { 
                let rawPos = m.progress !== undefined ? m.progress : m.to;
                let targetPos = parseInt(rawPos, 10);
                
                let eColor = m.eatenColor;
                let eId = m.eaten;

                if (!eId && !isNaN(targetPos) && targetPos >= 0 && targetPos <= 50) {
                    let posAbs = (offsets[moveColor] + targetPos) % 52;
                    let esSalida = (targetPos === 0);

                    if (!safeZones.includes(posAbs) || esSalida) {
                        let count = 0;
                        let fichas = [];
                        ['rojo', 'verde', 'azul', 'amarillo'].forEach(c => {
                            gameState[c].forEach(f => {
                                if (f.progress >= 0 && f.progress <= 50 && ((offsets[c] + f.progress) % 52) === posAbs) {
                                    count++;
                                    fichas.push({id: f.id, color: c});
                                }
                            });
                        });

                        if (esSalida && count >= 2) {
                            const rivalArr = [...fichas].reverse();
                            const rival = rivalArr.find(f => f.color !== moveColor);
                            if (rival) {
                                eId = rival.id;
                                eColor = rival.color;
                            }
                        } else if (!safeZones.includes(posAbs) && count >= 1) {
                            const rival = fichas.find(f => f.color !== moveColor);
                            if (rival) {
                                eId = rival.id;
                                eColor = rival.color;
                            }
                        }
                    }
                }

                if (!eColor && eId) {
                    if (eId.startsWith('r')) eColor = 'rojo';
                    else if (eId.startsWith('v')) eColor = 'verde';
                    else if (eId.startsWith('a')) eColor = 'azul';
                    else if (eId.startsWith('y')) eColor = 'amarillo';
                }

                if (!isNaN(targetPos)) {
                    actualizarTableroVisual(m.piece, moveColor, targetPos, eId, eColor);
                    if (!m.isThirdSix && !isReplay) {
                        
                        // LOG RICO PARA MOVIMIENTO DE OPONENTE
                        let oppLogMsg = `${moveColor.toUpperCase()} mueve ficha.`;
                        
                        if (eId && eColor) {
                            oppLogMsg = `¡${moveColor.toUpperCase()} se come una ficha ${eColor.toUpperCase()}! Cuenta 20.`;
                        } else if (targetPos === 56) {
                            oppLogMsg = `¡${moveColor.toUpperCase()} mete ficha en la meta! Cuenta 10.`;
                        } else if (m.openedBarrier) {
                            oppLogMsg = `${moveColor.toUpperCase()} abre barrera por obligación del 6.`;
                        }

                        log(oppLogMsg); 
                    }
                }
            } else {
                if (!m.isThirdSix && !isReplay) {
                    // LOG RICO CUANDO OPONENTE NO PUEDE MOVER
                    if (m.keepTurn) {
                        log(`${moveColor.toUpperCase()} sin movimientos. Tira de nuevo.`);
                    } else {
                        log(`${moveColor.toUpperCase()} sin movimientos. Pasa turno.`);
                    }
                }
            }
        }

        if (m.type === 'PARCHIS_WIN') {
            if (!didAwardRef.current) {
                didAwardRef.current = true;
                // 🔴 LÓGICA DE RECEPCIÓN DE DERROTA BASADA EN API INTEGRACIÓN 🔴
                window.parent.postMessage({ type: 'SCORE_UPDATE', score: 0 }, '*');
                window.parent.postMessage({ type: 'GAME_OVER', score: 0 }, '*');
                onScoreUpdate?.(0); // Mantenemos el callback local
                toast.info("Derrota");
            }
            setTimeout(() => {
                window.location.reload(); 
            }, 3000);
        }

        if (m.type === 'ROOM_CLOSED') {
            if (leavingRef.current || closeHandledRef.current) return;
            closeHandledRef.current = true;
            toast.error("La partida ya no está disponible.");
            leaveGameView();
            return;
        }

        if (false && m.type === 'ROOM_CLOSED') {
            alert("⚠️ La partida terminó. Alguien abandonó.");
            window.location.reload(); 
        }
    };

    window.addEventListener('message', handleMessage);

    function log(t) {
        const newLog = { move: t, player: '🎲' };
        localLogsRef.current = [...localLogsRef.current, newLog];
        setMoveHistoryState(localLogsRef.current);
        onMoveHistoryChangeRef.current?.(localLogsRef.current);
    }

    return () => {
        window.removeEventListener('message', handleMessage);
    };

  }, [screen, user]); 

  // PINTA LAS TARJETAS Y APLICA LA LÓGICA DE OPACIDAD
  const renderPlayerCard = (color) => {
    const isMe = myColorState === color;
    const isMyTurn = isMe && isMyTurnState;
    const style = teamStyles[color] || teamStyles.default;

    let displayName = "Esperando...";
    let isActive = false;
    
    if (isMe) {
      displayName = nickName(user?.full_name) || "Tú";
      isActive = true; 
    } else if (playerNames[color]) {
      displayName = playerNames[color];
      isActive = true; 
    }

    // Aplicamos opacidad condicional según la actividad
    const opacityClass = isActive ? "opacity-100" : "opacity-40";

    return (
      <div key={color} className={`flex flex-col justify-center p-3 rounded-lg border bg-[#1e293b] transition-all duration-300 min-h-[3rem] ${style.border} ${isActive ? style.shadow : ""} ${opacityClass}`}>
         <div className="flex justify-between items-center w-full">
           <span className="text-sm font-bold text-white break-words" title={displayName}>
             {displayName}
           </span>
           {isMyTurn && <span className={`w-2 h-2 rounded-full animate-pulse ml-2 flex-shrink-0 ${style.bg}`} />}
         </div>
      </div>
    );
  };

  const activeSessionPlayers = sessionPlayers
    .filter(player => player.status !== 'left')
    .sort((a, b) => a.seat - b.seat);
  const currentTurnPlayer = activeSessionPlayers.find(player => player.seat === currentTurnSeat) || null;
  const activeColors = activeSessionPlayers.map(player => SEAT_COLOR_NAMES[player.seat]).filter(Boolean);

  return (
    <div className="w-full relative bg-[#0f172a] text-white flex flex-col items-center">
      
      {screen === "lobby" && (
        <div className="w-full">
          <OnlineGameLobby
            title="Parchís Online"
            description="Juega al Parchís clásico con hasta 4 amigos"
            timeLimits={[]}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            joinCode={joinCode}
            onJoinCodeChange={setJoinCode}
            onFindMatch={handleFindMatch}
            onCancelSearch={() => { stopSearching(); cancelSearch().catch(() => {}); }}
            isSearching={isSearching}
            searchSeconds={searchSeconds}
            error={searchError}
          />
        </div>
      )}

      {screen === "waiting" && (
        <div className="w-full max-w-md mx-auto mt-8 px-4 pb-8 space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-1">Parchís Online</h2>
            <p className="text-gray-400 text-sm">Sala de espera</p>
          </div>

          {/* Room code */}
          {roomCodeState && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2">
              <span className="text-xs text-gray-400 uppercase tracking-widest">Código de sala</span>
              <button
                onClick={() => { navigator.clipboard.writeText(roomCodeState); toast.success('Código copiado'); }}
                className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                title="Copiar código de sala"
              >
                <span className="text-xl font-bold text-cyan-400 tracking-widest">{roomCodeState}</span>
                <Copy className="w-4 h-4 text-gray-400" />
              </button>
              <p className="text-xs text-gray-500">Comparte este código con tus amigos o invítalos desde el chat</p>
            </div>
          )}

          {/* Player slots */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-300">Jugadores ({sessionPlayers.length}/4)</span>
              <span className="text-xs text-gray-500">Mín. 2 para iniciar</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map(seat => {
                const color = SEAT_COLOR_NAMES[seat];
                const style = teamStyles[color];
                const player = sessionPlayers.find(p => p.seat === seat);
                return (
                  <div key={seat} className={`flex items-center gap-2 p-3 rounded-lg border bg-[#1e293b] ${player ? style.border : 'border-white/10'} ${player ? style.shadow : ''}`}>
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${player ? style.bg : 'bg-white/20'}`} />
                    <span className={`text-sm font-medium truncate ${player ? 'text-white' : 'text-gray-500'}`}>
                      {player ? nickName(player.user_name) : 'Esperando...'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Start / waiting message */}
          {isHostRef.current ? (
            <button
              onClick={handleStartGame}
              disabled={sessionPlayers.length < 2}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all bg-gradient-to-r from-green-700 to-cyan-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              Iniciar partida ({sessionPlayers.length}/4 jugadores)
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Esperando a que el anfitrión inicie la partida...
            </div>
          )}
        </div>
      )}

      {screen === "playing" && (
        <div className="w-full max-w-5xl p-4 flex flex-col items-center gap-4 mt-2">
          
          <div className="parchis-wrapper w-full md:w-fit flex flex-col items-center md:items-start mx-auto">
            <style>{`
              .parchis-wrapper { font-family: 'Segoe UI', system-ui; user-select: none; }
              .parchis-wrapper .card { background: #1e293b; padding: 1.5rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); }
              
              /* TABLERO */
              .parchis-wrapper .board { 
                  display: grid; grid-template-columns: repeat(15, 30px); grid-template-rows: repeat(15, 30px); 
                  gap: 2px; background: #cbd5e1; padding: 10px; border-radius: 8px; border: 4px solid #334155; position: relative;
              }
              
              .parchis-wrapper .cell { 
                  background: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; 
                  position: relative; font-size: 0.7rem; color: #cbd5e1; gap: 2px;
              }
              .parchis-wrapper .safe-zone { background: #94a3b8 !important; border: 2px solid #64748b; color: white; }
              
              .parchis-wrapper .home { border-radius: 8px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 5px; padding: 10px;}
              .parchis-wrapper .home.verde { background: #22c55e; grid-column: 1 / 7; grid-row: 1 / 7; }
              .parchis-wrapper .home.azul { background: #3b82f6; grid-column: 10 / 16; grid-row: 1 / 7; }
              .parchis-wrapper .home.rojo { background: #ef4444; grid-column: 1 / 7; grid-row: 10 / 16; }
              .parchis-wrapper .home.amarillo { background: #eab308; grid-column: 10 / 16; grid-row: 10 / 16; }
              
              .parchis-wrapper .path-verde { background: #bbf7d0 !important; }
              .parchis-wrapper .path-azul { background: #bfdbfe !important; }
              .parchis-wrapper .path-rojo { background: #fecaca !important; }
              .parchis-wrapper .path-amarillo { background: #fef08a !important; }
              
              .parchis-wrapper #meta { background: #334155; grid-column: 7 / 10; grid-row: 7 / 10; border-radius: 8px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; padding: 5px; gap: 2px;}
              
              .parchis-wrapper .token { 
                  width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; 
                  box-shadow: 0 2px 4px rgba(0,0,0,0.5); cursor: pointer; transition: all 0.3s ease; 
                  z-index: 10; flex-shrink: 0; 
              }
              
              .parchis-wrapper .cell > .token:first-of-type:nth-last-of-type(2),
              .parchis-wrapper .cell > .token:first-of-type:nth-last-of-type(2) ~ .token {
                  width: 12px;
                  border-radius: 6px;
              }

              .parchis-wrapper .token.verde { background: #16a34a; }
              .parchis-wrapper .token.azul { background: #2563eb; }
              .parchis-wrapper .token.rojo { background: #dc2626; }
              .parchis-wrapper .token.amarillo { background: #ca8a04; }
              
              .parchis-wrapper .token.movable { animation: pulse 1s infinite; border-color: #fde047; z-index: 20; transform: scale(1.1); }
              @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(253, 224, 71, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(253, 224, 71, 0); } 100% { box-shadow: 0 0 0 0 rgba(253, 224, 71, 0); } }
              
              /* CONTROLES LATERALES ADAPTADOS PARA MÓVIL Y ESCRITORIO */
              .parchis-wrapper .room-code-panel { display: none !important; }
              .parchis-wrapper .controls { width: 100% !important; max-width: 506px !important; }
              @media (min-width: 768px) { .parchis-wrapper .controls { width: 280px !important; max-width: 280px !important; height: 506px !important; justify-content: center !important; gap: 2.5rem !important; } }
              
              /* FIX DEL "ENTRECORTE": Forzar forma cuadrada absoluta para que gire sin salir de los bordes */
              .parchis-wrapper .dice-container { 
                  font-size: 3.5rem; 
                  width: 90px;
                  height: 90px;
                  cursor: pointer; 
                  transition: transform 0.3s ease-in-out; 
                  background: #0f172a; 
                  border-radius: 1rem; 
                  border: 1px solid #334155; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center;
                  flex-shrink: 0;
              }
              @media (min-width: 768px) { 
                  .parchis-wrapper .dice-container { 
                      font-size: 5.5rem; 
                      width: 150px;
                      height: 150px;
                      border-radius: 1.5rem;
                  } 
              }
              
              .parchis-wrapper .dice-container:active { transform: scale(0.9); }
              .parchis-wrapper .dice-container.disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
            `}</style>
            
            {/* 1. TARJETAS DE JUGADORES */}
            <div className="w-full md:max-w-[792px]">
                <div className="grid grid-cols-2 gap-4 w-full mb-4">
                    {activeColors.map((color) => renderPlayerCard(color))}
                </div>
            </div>

            {/* 2. TABLERO Y CONTROLES */}
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start w-full md:max-w-[792px]">
                
                {/* TABLERO */}
                <div className="board card flex-shrink-0" id="board" style={{padding: '10px', margin: 0}}>
                    <div className="home verde" id="home-verde"></div>
                    <div className="home azul" id="home-azul"></div>
                    <div className="home rojo" id="home-rojo"></div>
                    <div className="home amarillo" id="home-amarillo"></div>
                    <div id="meta"></div>
                </div>

                <div className="w-full md:w-[280px] md:flex-shrink-0 flex flex-col gap-3">
                {/* CONTROLES */}
                <div className="controls card flex flex-row md:flex-col items-center justify-between md:justify-center h-auto w-full p-4 md:p-6" style={{ margin: 0 }}>
                    
                    {/* ZONA DE CÓDIGO DE SALA (A la derecha en móvil, arriba en PC) */}
                    {roomCodeState && (
                        <div className="room-code-panel w-1/2 md:w-full flex flex-col items-center order-2 md:order-1 border-l md:border-l-0 md:border-b border-white/10 pl-4 md:pl-0 md:pb-6">
                            <span className="text-xs text-gray-400 uppercase tracking-widest mb-3 font-semibold">Código de Sala</span>
                            <button 
                                onClick={() => { navigator.clipboard.writeText(roomCodeState); toast.success("Código copiado"); }}
                                className="flex items-center gap-2 md:gap-3 px-4 md:px-8 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-colors w-fit justify-center group overflow-hidden"
                                title="Copiar código"
                            >
                                <span className="text-base md:text-xl font-bold text-cyan-400 tracking-widest truncate">{roomCodeState}</span>
                                <Copy className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-white transition-colors flex-shrink-0" />
                            </button>
                        </div>
                    )}

                    {/* ZONA DE TIRADA (A la izquierda en móvil, abajo en PC) */}
                    <div className="w-1/2 md:w-full flex flex-col items-center order-2 md:order-1 border-l md:border-l-0 md:border-b border-white/10 pl-4 md:pl-0 md:pb-6">
                        <span className="text-xs text-gray-400 uppercase tracking-widest mb-3 font-semibold">Turno actual</span>
                        <div className="flex items-center justify-center px-4 md:px-6 py-3 bg-white/5 border border-white/10 rounded-2xl w-full">
                            <span className="text-sm md:text-lg font-bold text-cyan-400 text-center">
                              {isMyTurnState
                                ? 'Tu turno'
                                : currentTurnPlayer
                                  ? `Turno de ${nickName(currentTurnPlayer.user_name)}`
                                  : 'Esperando turno'}
                            </span>
                        </div>
                    </div>

                    <div className="w-1/2 md:w-full flex flex-col items-center order-1 md:order-2">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest w-full text-center mb-4">Tirada</h3>
                        
                        <div id="dice" className="dice-container disabled">🎲</div>
                        
                        <div
                          id="diceResult"
                          className="mt-4 min-h-[56px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-lg font-black text-amber-300 shadow-[0_0_24px_rgba(253,224,71,0.16)] md:text-2xl"
                        >&nbsp;</div>
                    </div>
                </div>

                <button
                  onClick={() => setLeaveOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/15"
                >
                  <Flag className="w-4 h-4" />
                  Abandonar partida
                </button>
                </div>
            </div>

          </div>
        </div>
      )}

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Abandonar partida?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {screen === 'playing'
                ? 'Si sales ahora, dejarás de formar parte de la partida. Los demás seguirán jugando si quedan al menos dos jugadores; si solo queda uno, ganará por abandono.'
                : 'Volverás al lobby de parchís.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90" onClick={handleConfirmLeave}>
              Salir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
