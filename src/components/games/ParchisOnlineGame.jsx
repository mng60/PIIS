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

export default function ParchisOnlineGame({ isPlaying, user, gameId, onRoomCodeChange, onMoveHistoryChange }) {
  const [screen, setScreen] = useState("lobby");
  const [joinCode, setJoinCode] = useState("");

  // Estados de React para la nueva interfaz superior
  const [myColorState, setMyColorState] = useState(null);
  const [isMyTurnState, setIsMyTurnState] = useState(false);
  const [roomCodeState, setRoomCodeState] = useState("");
  const [participants, setParticipants] = useState([]); // Array con los jugadores reales

  // Array ref para ir guardando el historial de forma local
  const localLogsRef = useRef([]);

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
    // EL FIX CLAVE: Ahora dejamos pasar toda la info por la red para que el rival sepa QUIÉN pasó el turno y por qué
    extractAction: (msg) => ({
      piece: msg.piece,
      to: msg.to,
      dice: msg.dice,
      color: msg.color,
      progress: msg.progress,
      eaten: msg.eaten,
      eatenColor: msg.eatenColor,
      keepTurn: msg.keepTurn,
      isThirdSix: msg.isThirdSix
    }),
    buildOpponentMessage: (action) => ({
      type: 'OPPONENT_MOVED',
      ...action
    })
  });

  // Sincronizar el código de la sala inicial
  useEffect(() => {
    if (roomCode) {
      onRoomCodeChange?.(roomCode);
      setRoomCodeState(roomCode);
    }
  }, [roomCode, onRoomCodeChange]);

  // EL RADAR DEFINITIVO: Escanea tu backend y asegura los nombres reales rompiendo caché
  useEffect(() => {
    if (screen !== "playing" || !roomCodeState) return;

    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${roomCodeState}?t=${Date.now()}`, { cache: 'no-store' });
        const contentType = res.headers.get("content-type");
        
        // Verificamos que sea JSON válido para que no explote
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          let parsedParts = [];
          
          if (Array.isArray(data.participants)) {
            parsedParts = data.participants;
          } else if (typeof data.participants === 'string') {
            try { parsedParts = JSON.parse(data.participants); } catch (e) {}
          } else if (data.participants && Array.isArray(data.participants.participants)) {
            parsedParts = data.participants.participants;
          }
          
          if (!Array.isArray(parsedParts)) parsedParts = [];
          setParticipants(parsedParts);
        }
      } catch (e) {
        // Fallo silencioso si hay problemas de red temporales
      }
    };

    fetchSession(); // Primera lectura al instante
    const interval = setInterval(fetchSession, 2500); // Polling cada 2.5s
    return () => clearInterval(interval);
  }, [screen, roomCodeState]);

  // FIX: Cambiamos el orden. Primero mostramos el tablero, luego lanzamos la petición de red
  const handleCreateRoom = () => {
    setScreen("playing");
    setTimeout(() => {
      window.postMessage({ type: 'CREATE_ROOM' }, '*');
    }, 100); 
  };

  const handleJoinRoom = (code) => {
    const cleanCode = code.trim().toUpperCase();
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
            
            // LOG LOCAL: Tira el dado en 3a persona
            log(`${myColor.toUpperCase()} tira un ${currentDice}.`);

            if (currentDice === 6) {
                consecutiveSixes++;
            } else {
                consecutiveSixes = 0;
            }

            if (consecutiveSixes === 3) {
                log(`${myColor.toUpperCase()} saca tres 6. Pierde turno.`);
                
                let savedDice = currentDice; 
                if (lastMovedPieceId) {
                    const f = gameState[myColor].find(x => x.id === lastMovedPieceId);
                    if (f && f.progress >= 0 && f.progress <= 50) {
                        f.progress = -1;
                        actualizarTableroVisual(f.id, myColor, -1, null, null);
                        enviarJugada(f.id, -1, null, null, false, savedDice, true);
                    } else {
                        enviarJugada(null, null, null, null, false, savedDice, true);
                    }
                } else {
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
        } else if (captures.length > 0) {
            filteredMoves = captures;
        } else {
            filteredMoves = possibleMoves;
        }

        if (filteredMoves.length === 0) {
            let hadSix = (currentDice === 6 && bonusMoves === 0);
            let savedDice = currentDice; 

            if (hadSix) {
                log(`Sin movimientos. Tira de nuevo.`);
            } else if (bonusMoves === 0) {
                log(`Sin movimientos. Pasa turno.`);
            }
            
            bonusMoves = 0;
            currentDice = 0;
            
            setTimeout(() => {
                // Pasamos el dado y si mantuvimos turno para que el rival registre bien el pase de turno
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
        
        log(`${myColor.toUpperCase()} mueve ficha.`);

        let earnedBonus = 0;
        if (comidaId) earnedBonus = 20; 
        else if (nuevoProgreso === 56) earnedBonus = 10; 

        let usedBonus = (bonusMoves > 0);
        let hadSix = (!usedBonus && currentDice === 6); 
        
        let savedDice = currentDice;

        if (usedBonus) bonusMoves = 0; else currentDice = 0;
        if (earnedBonus > 0) bonusMoves = earnedBonus;

        let keepsTurn = (bonusMoves > 0 || hadSix);

        enviarJugada(fichaId, nuevoProgreso, comidaId, comidaColor, keepsTurn, savedDice, false);

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
            setTimeout(() => alert("🎉 ¡HAS GANADO LA PARTIDA! 🎉"), 500);
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

    function enviarJugada(fichaId, nuevoProgreso, comidaId, colorComida, mantieneTurno, overrideDice = null, isThirdSix = false) {
        let diceToSend = overrideDice !== null ? overrideDice : currentDice;

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
            isThirdSix: isThirdSix // Pasamos este dato vital por la red
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
                onRoomCodeChangeRef.current?.(m.code);
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
            let moveColor = m.color;
            
            // Intento de rescate por si el color de red fallara, inferimos a través de la ficha
            if (!moveColor && m.piece) {
                if (m.piece.startsWith('r')) moveColor = 'rojo';
                else if (m.piece.startsWith('v')) moveColor = 'verde';
                else if (m.piece.startsWith('a')) moveColor = 'azul';
                else if (m.piece.startsWith('y')) moveColor = 'amarillo';
            }
            
            if (!moveColor) return; // Salvaguarda si algo crítico falla por red

            // 1. Log común de tirada de dado para TODOS (solo si hay dado real)
            if (m.dice && m.dice > 0) {
                log(`${moveColor.toUpperCase()} tira un ${m.dice}.`);
            }

            // 2. Log de penalización si se dio el caso
            if (m.isThirdSix) {
                log(`${moveColor.toUpperCase()} saca tres 6. Pierde turno.`);
            }
            
            // 3. Evaluar movimiento o paso de turno
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
                    // Solo anunciamos "mueve ficha" si no es un castigo que la está enviando a casa
                    if (!m.isThirdSix) {
                        log(`${moveColor.toUpperCase()} mueve ficha.`); 
                    }
                }
            } else {
                // LOG REMOTO: Pasa turno (o tira de nuevo sin haber movido pieza)
                if (!m.isThirdSix) {
                    if (m.keepTurn) {
                        log(`Sin movimientos. Tira de nuevo.`);
                    } else {
                        log(`Sin movimientos. Pasa turno.`);
                    }
                }
            }
        }

        if (m.type === 'ROOM_CLOSED') {
            alert("⚠️ La partida terminó. Alguien abandonó.");
            window.location.reload(); 
        }
    };

    window.addEventListener('message', handleMessage);

    function log(t) {
        const newLog = { move: t, player: '🎲' };
        localLogsRef.current = [...localLogsRef.current, newLog];
        onMoveHistoryChangeRef.current?.(localLogsRef.current);
    }

    return () => {
        window.removeEventListener('message', handleMessage);
    };

  }, [screen]); 

  const renderPlayerCard = (color) => {
    const isMe = myColorState === color;
    const isMyTurn = isMe && isMyTurnState;
    const style = teamStyles[color] || teamStyles.default;

    // Texto fijo sin lógica de base de datos
    const displayName = isMe ? (nickName(user?.full_name) || "Tú") : "Rival";

    // Siempre encendidos: opacity-100 y style.shadow añadidos siempre
    return (
      <div key={color} className={`flex flex-col justify-center p-3 rounded-lg border bg-[#1e293b] transition-all duration-300 min-h-[3rem] ${style.border} ${style.shadow} opacity-100`}>
         <div className="flex justify-between items-center w-full">
           <span className="text-sm font-bold text-white break-words" title={displayName}>
             {displayName}
           </span>
           {isMyTurn && <span className={`w-2 h-2 rounded-full animate-pulse ml-2 flex-shrink-0 ${style.bg}`} />}
         </div>
      </div>
    );
  };

  // Cuatro colores fijos siempre visibles
  const activeColors = ['rojo', 'azul', 'amarillo', 'verde'];

  return (
    <div className="w-full relative min-h-screen bg-[#0f172a] text-white flex flex-col items-center">
      
      {/* PANTALLA LOBBY */}
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

      {/* PANTALLA DE JUEGO MULTIJUGADOR */}
      {screen === "playing" && (
        <div className="w-full max-w-5xl p-4 flex flex-col items-center gap-4 mt-2">
          
          <div className="parchis-wrapper w-full flex flex-col md:flex-row gap-6 justify-center items-start">
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
              
              /* CONTROLES LATERALES */
              .parchis-wrapper .controls { display: flex; flex-direction: column; width: 280px; }
              .parchis-wrapper .dice-container { font-size: 5rem; margin: 1.5rem 0; cursor: pointer; transition: transform 0.2s; background: #0f172a; border-radius: 1rem; border: 1px solid #334155; padding: 1.5rem; display: flex; justify-content: center; align-items: center;}
              .parchis-wrapper .dice-container:active { transform: scale(0.9); }
              .parchis-wrapper .dice-container.disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
            `}</style>
            
            <div className="flex flex-col gap-4 items-center">
                <div className="grid grid-cols-2 gap-4 w-full">
                   {activeColors.map((color) => renderPlayerCard(color))}
                </div>

                <div className="board card" id="board" style={{padding: '10px'}}>
                    <div className="home verde" id="home-verde"></div>
                    <div className="home azul" id="home-azul"></div>
                    <div className="home rojo" id="home-rojo"></div>
                    <div className="home amarillo" id="home-amarillo"></div>
                    <div id="meta"></div>
                </div>
            </div>

            <div className="controls card flex flex-col items-center justify-start h-full">
                {roomCodeState && (
                  <div className="w-full flex flex-col items-center mb-6 pb-4 border-b border-white/10">
                    <span className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-semibold">Código de Sala</span>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(roomCodeState); toast.success("Código copiado"); }}
                      className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors w-full justify-center group"
                      title="Copiar código"
                    >
                      <span className="text-lg font-bold text-cyan-400 tracking-widest">{roomCodeState}</span>
                      <Copy className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                )}

                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest w-full text-center mb-2">Tirada</h3>
                
                <div id="dice" className="dice-container disabled w-full">🎲</div>
                <div id="diceResult" style={{fontSize: '1.2rem', fontWeight: 'bold', minHeight: '30px', color: '#fde047'}}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}