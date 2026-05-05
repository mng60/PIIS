import React, { useRef, useEffect, useState } from 'react';
import { useTurnGameRelay } from '@/hooks/useTurnGameRelay';
import OnlineGameLobby from "@/components/games/OnlineGameLobby";
import { Copy, Users } from "lucide-react";
import { toast } from "sonner";

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

export default function ParchisOnlineGame({ isPlaying, user, gameId, onRoomCodeChange, onMoveHistoryChange, onScoreUpdate }) {
  const [screen, setScreen] = useState("lobby");
  const [joinCode, setJoinCode] = useState("");

  // Estados de React para la nueva interfaz superior
  const [myColorState, setMyColorState] = useState(null);
  const [isMyTurnState, setIsMyTurnState] = useState(false);
  const [roomCodeState, setRoomCodeState] = useState("");
  
  // ESTADO P2P: Guarda los nombres dictados directamente por la red
  const [playerNames, setPlayerNames] = useState({}); 

  // Array ref para ir guardando el historial de forma local
  const localLogsRef = useRef([]);
  const playerNamesRef = useRef({});
  const userRef = useRef(user);
  
  // FIX CHAT: Referencia para saber si somos los creadores de la sala
  const isHostRef = useRef(false);
  // FIX VICTORIAS: Evitar que asigne puntos múltiples veces
  const didAwardRef = useRef(false);

  useEffect(() => {
    playerNamesRef.current = playerNames;
    userRef.current = user;
  }, [playerNames, user]);

  // Refs para que el EventListener de VanillaJS pueda actualizar React
  const onRoomCodeChangeRef = useRef(onRoomCodeChange);
  const onMoveHistoryChangeRef = useRef(onMoveHistoryChange);
  const setMyColorStateRef = useRef(null);
  const setIsMyTurnStateRef = useRef(null);
  const setRoomCodeStateRef = useRef(null);

  useEffect(() => {
    onRoomCodeChangeRef.current = onRoomCodeChange;
    onMoveHistoryChangeRef.current = onMoveHistoryChange;
    setMyColorStateRef.current = setMyColorState;
    setIsMyTurnStateRef.current = setIsMyTurnState;
    setRoomCodeStateRef.current = setRoomCodeState;
  }, [onRoomCodeChange, onMoveHistoryChange]);

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
      openedBarrier: msg.openedBarrier, // EXTRAEMOS SI SE ABRIÓ BARRERA PARA LOGGEARLO
      playerName: msg.playerName  // Extraemos el nombre que viene incrustado en la jugada real
    }),
    buildOpponentMessage: (action) => ({
      type: 'OPPONENT_MOVED',
      ...action
    })
  });

  // Sincronizar el código de la sala inicial
  useEffect(() => {
    if (roomCode) {
      setRoomCodeState(roomCode);
      
      // FIX CHAT: Si somos el creador, damos 1.5s de margen al backend 
      // para que termine de crear la sala antes de avisar al componente Chat
      if (isHostRef.current) {
        setTimeout(() => {
          onRoomCodeChange?.(roomCode);
        }, 1500);
      } else {
        onRoomCodeChange?.(roomCode);
      }
    }
  }, [roomCode, onRoomCodeChange]);

  const handleCreateRoom = () => {
    isHostRef.current = true; // FIX CHAT: Marcamos que somos el host
    setScreen("playing");
    setTimeout(() => {
      window.postMessage({ type: 'CREATE_ROOM' }, '*');
    }, 100); 
  };

  const handleJoinRoom = (code) => {
    const cleanCode = code.trim().toUpperCase();
    isHostRef.current = false; // FIX CHAT: Nos aseguramos de marcar que somos invitados
    setScreen("playing");
    setTimeout(() => {
      onRoomCodeChange?.(cleanCode); 
      setRoomCodeState(cleanCode);
      window.postMessage({ type: 'JOIN_ROOM', code: cleanCode }, '*');
    }, 100);
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
        if (ficha.progress === -1) {
            if (moveValue !== 5) return null;
            let posAbs = offsets[myColor];
            let occ = countFichasEnCasilla(posAbs);

            if (occ.count < 2) return { type: 'exit', target: 0, eatenId: null };
            if (occ.count === 2) {
                const rival = occ.fichas.find(f => f.color !== myColor);
                if (rival) return { type: 'exit', target: 0, eatenId: rival.id };
                return null;
            }
            return null;
        }

        let target = ficha.progress + moveValue;
        if (target > 56) return null; 

        if (target >= 0 && target <= 50) {
            let posAbs = (offsets[myColor] + target) % 52;
            let occ = countFichasEnCasilla(posAbs);
            if (occ.count >= 2) return null; 
        } else if (target > 50 && target < 56) {
            let count = gameState[myColor].filter(f => f.progress === target).length;
            if (count >= 2) return null; 
        }

        for (let p = ficha.progress + 1; p < target; p++) {
            if (p <= 50) {
                let posAbs = (offsets[myColor] + p) % 52;
                let occ = countFichasEnCasilla(posAbs);
                if (occ.count >= 2 && safeZones.includes(posAbs)) {
                    return null; 
                }
            }
        }

        let isCapture = false;
        let eatenId = null;
        if (target >= 0 && target <= 50) {
            let posAbs = (offsets[myColor] + target) % 52;
            if (!safeZones.includes(posAbs)) {
                let occ = countFichasEnCasilla(posAbs);
                if (occ.count === 1 && occ.fichas[0].color !== myColor) {
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
            currentDice = Math.floor(Math.random() * 6) + 1;
            document.getElementById('diceResult').innerText = `🎲 ${currentDice}`;
            log(`Tiras un ${currentDice}.`); // REGISTRO LOCAL DE TIRADA
            
            if (currentDice === 6) {
                consecutiveSixes++;
            } else {
                consecutiveSixes = 0;
            }

            if (consecutiveSixes === 3) {
                let savedDice = currentDice; 
                if (lastMovedPieceId) {
                    const f = gameState[myColor].find(x => x.id === lastMovedPieceId);
                    if (f && f.progress >= 0 && f.progress <= 50) {
                        log(`¡Tres 6 seguidos! Ficha a casa.`); // REGISTRO DE CASTIGO
                        f.progress = -1;
                        actualizarTableroVisual(f.id, myColor, -1, null, null);
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
        let moveValue = bonusMoves > 0 ? bonusMoves : currentDice;
        let possibleMoves = [];

        gameState[myColor].forEach(ficha => {
            let moveInfo = getMoveInfo(ficha, moveValue);
            if (moveInfo) {
                let inBarrier = false;
                if (ficha.progress >= 0 && ficha.progress < 56) {
                    let misFichasAqui = gameState[myColor].filter(f2 => f2.progress === ficha.progress).length;
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
            
            // REGISTROS RICOS SI NO HAY MOVIMIENTOS
            if (bonusMoves > 0) {
                log(`No puedes contar las ${bonusMoves}. Pasas turno.`);
            } else if (currentDice > 0) {
                if (hadSix) log(`Sin movimientos con el ${currentDice}. Tiras de nuevo.`);
                else log(`Sin movimientos con el ${currentDice}. Pasas turno.`);
            }
            
            bonusMoves = 0;
            currentDice = 0;
            
            setTimeout(() => {
                enviarJugada(null, null, null, null, hadSix, savedDice, false);
                
                if (hadSix) {
                    const diceEl = document.getElementById('dice');
                    if (diceEl) diceEl.classList.remove('disabled');
                    const diceRes = document.getElementById('diceResult');
                    if (diceRes) diceRes.innerText = '¡Tira de nuevo!';
                }
            }, 1500); 
        } else {
            filteredMoves.forEach(m => {
                document.getElementById(m.ficha.id).classList.add('movable');
            });
        }
    }

    function intentarMoverFicha(fichaId, colorFicha) {
        if (!isMyTurn || (currentDice === 0 && bonusMoves === 0) || colorFicha !== myColor) return;
        const el = document.getElementById(fichaId);
        if (!el.classList.contains('movable')) return;

        document.querySelectorAll('.movable').forEach(e => e.classList.remove('movable'));
        lastMovedPieceId = fichaId;

        const ficha = gameState[myColor].find(f => f.id === fichaId);
        let moveValue = bonusMoves > 0 ? bonusMoves : currentDice;
        
        // COMPROBAR SI ACABA DE ABRIR UNA BARRERA PARA COMUNICARLO
        let wasBarrierOpen = false;
        if (currentDice === 6 && bonusMoves === 0) {
            let misFichasAqui = gameState[myColor].filter(f2 => f2.progress === ficha.progress).length;
            if (misFichasAqui === 2) wasBarrierOpen = true;
        }

        let moveInfo = getMoveInfo(ficha, moveValue);
        if (!moveInfo) return; 

        let nuevoProgreso = moveInfo.target;
        let comidaId = moveInfo.eatenId;
        let comidaColor = null;

        if (comidaId) {
            const coloresRivales = ['rojo', 'verde', 'azul', 'amarillo'].filter(c => c !== myColor);
            for (let c of coloresRivales) {
                if (gameState[c].find(f => f.id === comidaId)) {
                    comidaColor = c; break;
                }
            }
        }

        actualizarTableroVisual(fichaId, myColor, nuevoProgreso, comidaId, comidaColor);

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
                document.getElementById('diceResult').innerHTML = `⭐ ¡Premio de ${bonusMoves}!`;
                evaluarMovimientosPosibles();
            } else {
                document.getElementById('diceResult').innerText = '¡Tira de nuevo!';
                document.getElementById('dice').classList.remove('disabled');
            }
        }

        const allInMeta = gameState[myColor].every(f => f.progress === 56);
        if (allInMeta) {
            setTimeout(() => {
                if (!didAwardRef.current) {
                    didAwardRef.current = true;
                    // LÓGICA DE VICTORIA BASADA EN LA API DE INTEGRACIÓN PARA TERCEROS 🔴
                    window.parent.postMessage({ type: 'SCORE_UPDATE', score: 1 }, '*');
                    window.parent.postMessage({ type: 'GAME_OVER', score: 1 }, '*');
                    onScoreUpdate?.(1); // Mantenemos el callback por si se ejecuta dentro del entorno local
                    toast.success("¡Victoria! +1 punto");
                    
                    window.postMessage({ type: 'PARCHIS_WIN', color: myColor }, '*');
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
        let diceToSend = overrideDice !== null ? overrideDice : currentDice;
        
        const currentName = userRef.current ? (nickName(userRef.current.full_name) || userRef.current.email?.split('@')[0]) : "Jugador";

        window.postMessage({
            type: 'PARCHIS_MOVE',
            piece: fichaId,
            color: myColor, 
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
            document.getElementById('diceResult').innerText = '';
        }
    }

    const handleMessage = (e) => {
        const m = e.data;
        if (!m || typeof m !== 'object') return;

        if (m.type === 'ROOM_CREATED') {
            if (m.code) {
                setRoomCodeStateRef.current?.(m.code);
                
                // FIX CHAT: Aplicamos el margen solo si somos el host
                if (isHostRef.current) {
                  setTimeout(() => {
                    onRoomCodeChangeRef.current?.(m.code);
                  }, 1500);
                } else {
                  onRoomCodeChangeRef.current?.(m.code);
                }
            }
        }
        
        if (m.type === 'ASSIGN_COLOR') { 
            myColor = m.color; 
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
            if (m.dice && m.dice > 0 && (!m.piece || !m.isThirdSix)) {
                log(`${moveColor.toUpperCase()} tira un ${m.dice}.`);
            }

            // LOG DE CASTIGO DE OPONENTE (CORREGIDO)
            if (m.isThirdSix) {
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
                    if (!m.isThirdSix) {
                        
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
                if (!m.isThirdSix) {
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
            alert("⚠️ La partida terminó. Alguien abandonó.");
            window.location.reload(); 
        }
    };

    window.addEventListener('message', handleMessage);

    function log(t) {
        const newLog = { move: t, player: '🎲' };
        localLogsRef.current = [newLog, ...localLogsRef.current];
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

  const activeColors = ['rojo', 'azul', 'amarillo', 'verde'];

  return (
    <div className="w-full relative min-h-screen bg-[#0f172a] text-white flex flex-col items-center">
      
      {screen === "lobby" && (
        <div className="w-full">
          <OnlineGameLobby
            title="Parchís Online"
            description="Juega al Parchís clásico con tus amigos"
            timeLimits={[]} 
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            joinCode={joinCode}
            onJoinCodeChange={setJoinCode}
          />
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
            <div className="w-full" style={{ maxWidth: '506px' }}>
                <div className="grid grid-cols-2 gap-4 w-full mb-4">
                    {activeColors.map((color) => renderPlayerCard(color))}
                </div>
            </div>

            {/* 2. TABLERO Y CONTROLES */}
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start w-full">
                
                {/* TABLERO */}
                <div className="board card flex-shrink-0" id="board" style={{padding: '10px', margin: 0}}>
                    <div className="home verde" id="home-verde"></div>
                    <div className="home azul" id="home-azul"></div>
                    <div className="home rojo" id="home-rojo"></div>
                    <div className="home amarillo" id="home-amarillo"></div>
                    <div id="meta"></div>
                </div>

                {/* CONTROLES */}
                <div className="controls card flex flex-row md:flex-col items-center justify-between md:justify-center h-auto w-full p-4 md:p-6" style={{ margin: 0 }}>
                    
                    {/* ZONA DE CÓDIGO DE SALA (A la derecha en móvil, arriba en PC) */}
                    {roomCodeState && (
                        <div className="w-1/2 md:w-full flex flex-col items-center order-2 md:order-1 border-l md:border-l-0 md:border-b border-white/10 pl-4 md:pl-0 md:pb-6">
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
                    <div className="w-1/2 md:w-full flex flex-col items-center order-1 md:order-2">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest w-full text-center mb-4">Tirada</h3>
                        
                        <div id="dice" className="dice-container disabled">🎲</div>
                        
                        <div id="diceResult" className="mt-4" style={{fontSize: '1.2rem', fontWeight: 'bold', minHeight: '30px', color: '#fde047'}}></div>
                    </div>
                </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}