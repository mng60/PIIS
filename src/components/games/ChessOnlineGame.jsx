import React, { useEffect, useRef, useState } from "react";
import { createChessRoom, getChessRoom, updateChessRoom, deleteChessRoom } from "@/api/chess";
import { submitChessElo } from "@/api/elo";
import { recordAbandon } from "@/api/users";
import { useAbandonWarning } from "@/lib/abandonWarning";
import { useCurrentRoom } from "@/lib/CurrentRoomContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Copy, Trophy, Settings, Scale, LogOut, Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { joinQueue, getMatchStatus, cancelSearch } from "@/api/matchmaking";
import { initBoard, safeParseBoardState, packBoardState, FILES, getPieceColor, getPieceType } from "@/components/chess/chessState";
import { calculateValidMoves } from "@/components/chess/chessMoves";
import { PIECE_SETS, renderPieceNode, getPieceDataUri } from "@/components/chess/chessPieces";
import { TIME_LIMITS, initClockFromMinutes, formatMs, getDisplayedMs, applyClockOnMove } from "@/components/chess/chessClock";
import OnlineGameLobby from "@/components/games/OnlineGameLobby";
import OnlineGamePlayerZone from "@/components/games/OnlineGamePlayerZone";


const BOARD_THEMES = {
  classic: { label: "Clásico", light: "#F0D9B5", dark: "#B58863", labelLight: "#B58863", labelDark: "#F0D9B5" },
  blue:    { label: "Azul",    light: "#E8EDF9", dark: "#4B7399", labelLight: "#4B7399", labelDark: "#E8EDF9" },
  green:   { label: "Verde",   light: "#EEEED2", dark: "#769656", labelLight: "#769656", labelDark: "#EEEED2" },
  dark:    { label: "Oscuro",  light: "#3A3A3A", dark: "#1F1F1F", labelLight: "#D0D0D0", labelDark: "#B0B0B0" },
};

const nowISO = () => new Date().toISOString();

const PIECE_NAMES_ES = { K: 'Rey', Q: 'Reina', R: 'Torre', B: 'Alfil', N: 'Caballo', '': 'Peón' };

// Always show display name, never raw email
const nickName = (name) => {
  if (!name) return null;
  if (name.includes('@')) return name.split('@')[0];
  return name;
};

export default function ChessOnlineGame({ user, gameId, myEloRating = 1200, onScoreUpdate, onEloApplied, onRoomCodeChange, onMoveHistoryChange, initialRoomCode, onLeave }) {
  const [screen, setScreen] = useState("lobby");
  const [roomCode, setRoomCode] = useState("");
  useEffect(() => {
    if (onRoomCodeChange) onRoomCodeChange(roomCode);
  }, [roomCode, onRoomCodeChange]);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);

  const [timeKey, setTimeKey] = useState("5");

  const [board, setBoard] = useState(initBoard());
  const [playerColor, setPlayerColor] = useState(null);
  const [currentTurn, setCurrentTurn] = useState("white");
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [opponentName, setOpponentName] = useState("Rival");
  const [opponentAvatarUrl, setOpponentAvatarUrl] = useState(null);
  const [opponentEloRating, setOpponentEloRating] = useState(null);
  const [showTurnFlash, setShowTurnFlash] = useState(false);
  const [gameStatus, setGameStatus] = useState("waiting");
  const [winner, setWinner] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);

  const [drawOfferBy, setDrawOfferBy] = useState(null);
  const [clock, setClock] = useState(null);

  const [incomingDrawOpen, setIncomingDrawOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { showWarning } = useAbandonWarning();
  const { setCurrentRoom, clearCurrentRoom } = useCurrentRoom();

  useEffect(() => {
    if (roomCode) setCurrentRoom({ roomCode, gameId, gameTitle: 'Ajedrez Online' });
    else clearCurrentRoom();
  }, [roomCode]); // eslint-disable-line

  useEffect(() => () => clearCurrentRoom(), []); // eslint-disable-line

  const [boardTheme, setBoardTheme] = useState(() => localStorage.getItem("chess_board_theme") || "classic");
  const [pieceSet, setPieceSet] = useState(() => localStorage.getItem("chess_piece_set") || "staunton");

  useEffect(() => localStorage.setItem("chess_board_theme", boardTheme), [boardTheme]);
  useEffect(() => localStorage.setItem("chess_piece_set", pieceSet), [pieceSet]);

  const theme = BOARD_THEMES[boardTheme] || BOARD_THEMES.classic;

  const roomCodeRef = useRef(null);   // room_code for API calls
  const lastUpdatedRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const matchPollRef = useRef(null);
  const searchTimerRef = useRef(null);

  const didAwardRef = useRef(false);
  const metaRef = useRef({});
  const lastOfferSeenRef = useRef(null);
  const didSyncNameRef = useRef(false);

  const hostEmailRef = useRef(null);
  const guestEmailRef = useRef(null);
  const lastSeenMoveIdRef = useRef(null);

  const clockStartGuardRef = useRef(false);
  const timeoutDeclaredRef = useRef(false);

  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    if (!clock || gameStatus !== "playing") return;
    const t = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(t);
  }, [clock, gameStatus]);

  const prevTurnRef = useRef(null);
  useEffect(() => {
    if (gameStatus !== "playing") return;
    if (prevTurnRef.current !== null && prevTurnRef.current !== currentTurn) {
      prevTurnRef.current = currentTurn;
      setShowTurnFlash(true);
      const t = setTimeout(() => setShowTurnFlash(false), 1500);
      return () => clearTimeout(t);
    }
    prevTurnRef.current = currentTurn;
  }, [currentTurn, gameStatus]);

  const stopSync = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startPolling = () => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(async () => {
      if (!roomCodeRef.current) return;
      try {
        const room = await getChessRoom(roomCodeRef.current);
        if (room.updated_at !== lastUpdatedRef.current) applyRoomUpdate(room);
      } catch {}
    }, 1200);
  };

  const maybeStartClockIfHost = (room, boardFromRoom, meta) => {
    if (!meta?.clock) return;
    if (meta.clock.lastTickAt) return;
    if (clockStartGuardRef.current) return;
    if (user?.email !== room.host_email) return;

    clockStartGuardRef.current = true;

    const nextMeta = { ...meta, clock: { ...meta.clock, lastTickAt: nowISO() } };
    metaRef.current = nextMeta;
    setClock(nextMeta.clock);

    updateChessRoom(room.room_code, {
      board_state: packBoardState(boardFromRoom, nextMeta),
    }).catch(() => {});
  };

  const applyRoomUpdate = (room) => {
    lastUpdatedRef.current = room.updated_at;
    hostEmailRef.current = room.host_email || hostEmailRef.current;
    guestEmailRef.current = room.guest_email || guestEmailRef.current;

    if (room.board_state) {
      const { board: b, meta } = safeParseBoardState(room.board_state);
      setBoard(b);

      metaRef.current = meta || {};
      setDrawOfferBy(meta?.drawOfferBy || null);
      setClock(meta?.clock || null);

      const offerBy = meta?.drawOfferBy || null;
      if (room.status === "playing" && offerBy && offerBy !== user?.email && lastOfferSeenRef.current !== offerBy) {
        lastOfferSeenRef.current = offerBy;
        setIncomingDrawOpen(true);
      }
      if (!offerBy) lastOfferSeenRef.current = null;

      if (room.status === "playing") {
        maybeStartClockIfHost(room, b, meta);
      }

      // Detect opponent moves via lastMove stored in meta (must be inside this block where meta is in scope)
      if (meta?.lastMove && meta.lastMove.id !== lastSeenMoveIdRef.current) {
        lastSeenMoveIdRef.current = meta.lastMove.id;
        setMoveHistory(prev => {
          const updated = [...prev, { move: meta.lastMove.notation, player: meta.lastMove.player }];
          onMoveHistoryChange?.(updated);
          return updated;
        });
      }
    }

    setCurrentTurn(room.current_turn || "white");
    setGameStatus(room.status);

    if (room.status !== "waiting") {
      const isHost = user?.email === room.host_email;
      const opp = isHost ? (room.guest_name || "Rival") : (room.host_name || "Rival");
      setOpponentName(nickName(opp) || "Rival");
      setOpponentAvatarUrl(isHost ? (room.guest_avatar_url || null) : (room.host_avatar_url || null));
      const oppEmail = isHost ? room.guest_email : room.host_email;
      if (oppEmail && gameId) {
        import("@/api/scores").then(({ getUserGameScores }) =>
          getUserGameScores(oppEmail, gameId)
            .then(stats => setOpponentEloRating(stats?.[0]?.elo_rating ?? 1200))
            .catch(() => {})
        );
      }
    }

    // Self-heal: cuando el host ve la partida en curso, actualiza host_name con el nombre actual (una sola vez)
    if (room.status === "playing" && user?.email === room.host_email && !didSyncNameRef.current) {
      didSyncNameRef.current = true;
      const currentName = nickName(user.full_name) || user.email.split('@')[0];
      if (room.host_name !== currentName) {
        updateChessRoom(room.room_code, { host_name: currentName }).catch(() => {});
      }
    }

    if (room.status === "finished") {
      const w = room.winner || null;
      setWinner(w);

      if (!didAwardRef.current) {
        didAwardRef.current = true;

        if (w === user?.email) {
          onScoreUpdate?.(1);
        } else if (w === "draw" || !w) {
          onScoreUpdate?.(0);
          toast.info("Tablas");
        } else {
          onScoreUpdate?.(0);
          toast.info("Derrota");
        }

        // Calcular y aplicar ELO (idempotente, el servidor ignora si ya fue procesado)
        submitChessElo(roomCodeRef.current).then(result => {
          if (result?.elo_enabled === false || result?.already_processed) return;
          const me = user?.email;
          const myData = result.updates?.find(u => u.email === me);
          if (!myData) return;
          const sign = myData.delta >= 0 ? "+" : "";
          toast.info(`ELO: ${myData.before} → ${myData.after} (${sign}${myData.delta})`, { duration: 4000 });
          onEloApplied?.();
        }).catch(() => {});
      }
    }
  };

  useEffect(() => () => stopSync(), []);

  // Auto-join tournament match room when arriving via ?room=CODE
  useEffect(() => {
    if (!initialRoomCode || !user) return;
    let cancelled = false;

    const autoJoin = async () => {
      setLoading(true);
      try {
        const room = await getChessRoom(initialRoomCode);
        if (!room || cancelled) return;

        roomCodeRef.current = initialRoomCode;
        lastUpdatedRef.current = room.updated_at;
        hostEmailRef.current = room.host_email;
        guestEmailRef.current = room.guest_email;
        didAwardRef.current = false;
        timeoutDeclaredRef.current = false;
        clockStartGuardRef.current = false;
        lastOfferSeenRef.current = null;

        const { board: b, meta } = safeParseBoardState(room.board_state);
        setBoard(b);
        metaRef.current = meta || {};
        setCurrentTurn(room.current_turn || "white");

        if (user.email === room.host_email) {
          setRoomCode(initialRoomCode);
          setPlayerColor("white");
          setGameStatus(room.status);
          setScreen("playing");
          setWinner(null);
          startPolling();
        } else if (!room.guest_email || user.email === room.guest_email) {
          if (!checkEloCompatibility(room.host_elo, room.game_mode)) {
            toast.error(`Sala clasificatoria: la diferencia de ELO es demasiado grande (±${ELO_RANGE}). No puedes unirte a esta partida.`);
            if (!cancelled) setLoading(false);
            return;
          }
          // guest ya registrado O llegada por invitación (guest_email vacío)
          let finalRoom = room;
          if (room.status === "waiting") {
            finalRoom = await updateChessRoom(initialRoomCode, {
              guest_name: nickName(user.full_name) || user.email.split("@")[0],
              guest_avatar_url: user.avatar_url || null,
              status: "playing",
            });
            lastUpdatedRef.current = finalRoom.updated_at;
          }
          setRoomCode(initialRoomCode);
          setPlayerColor("black");
          setOpponentName(nickName(room.host_name) || "Rival");
          setGameStatus(finalRoom.status);
          setScreen("playing");
          setWinner(null);
          startPolling();
        }
      } catch (e) {
        if (!cancelled) { console.error(e); setError("Error al unirse a la partida"); }
      }
      if (!cancelled) setLoading(false);
    };

    autoJoin();
    return () => { cancelled = true; };
  }, [initialRoomCode, user?.email]); // eslint-disable-line

  // timeout loop
  useEffect(() => {
    if (!clock || gameStatus !== "playing" || winner) return;
    if (!roomCodeRef.current) return;

    const interval = setInterval(async () => {
      if (!roomCodeRef.current) return;
      if (timeoutDeclaredRef.current) return;

      const display = getDisplayedMs(clock, currentTurn, Date.now());
      const ms = currentTurn === "white" ? display.white : display.black;

      if (ms !== null && ms <= 0) {
        timeoutDeclaredRef.current = true;

        const winnerColor = currentTurn === "white" ? "black" : "white";
        const winnerEmail = winnerColor === "white" ? hostEmailRef.current : guestEmailRef.current;
        if (!winnerEmail) return;

        didAwardRef.current = false;

        const meta = { ...(metaRef.current || {}) };
        if (meta.clock) {
          meta.clock = { ...meta.clock, whiteMs: Math.max(0, display.white), blackMs: Math.max(0, display.black), lastTickAt: nowISO() };
        }

        try {
          await updateChessRoom(roomCodeRef.current, {
            status: "finished",
            winner: winnerEmail,
            board_state: packBoardState(board, meta),
          });
        } catch {}
      }
    }, 400);

    return () => clearInterval(interval);
  }, [clock, gameStatus, winner, currentTurn, board]);

  const clearOpponentDrawOfferIfAny = () => {
    const meta = { ...(metaRef.current || {}) };
    if (meta.drawOfferBy && meta.drawOfferBy !== user?.email) {
      meta.drawOfferBy = null;
      meta.drawOfferAt = null;
      metaRef.current = meta;
      return meta;
    }
    return null;
  };

  const handleSquareClick = async (row, col) => {
    if (gameStatus !== "playing") return;
    if (currentTurn !== playerColor) return;
    if (!roomCodeRef.current) return;

    if (selectedSquare) {
      const isValidMove = validMoves.some((m) => m.row === row && m.col === col);

      if (isValidMove) {
        const newBoard = board.map((r) => [...r]);
        const piece = newBoard[selectedSquare.row][selectedSquare.col];
        const capturedPiece = newBoard[row][col];

        let nextMeta = { ...(metaRef.current || {}) };
        const maybeNewMeta = clearOpponentDrawOfferIfAny();
        if (maybeNewMeta) nextMeta = { ...maybeNewMeta };

        if (nextMeta.clock && nextMeta.clock.lastTickAt) {
          const { clock: updatedClock, timeoutWinner } = applyClockOnMove(nextMeta.clock, currentTurn, Date.now());
          nextMeta.clock = updatedClock;

          if (timeoutWinner) {
            const winnerEmail = timeoutWinner === "white" ? hostEmailRef.current : guestEmailRef.current;
            if (winnerEmail) {
              didAwardRef.current = false;
              await updateChessRoom(roomCodeRef.current, {
                status: "finished",
                winner: winnerEmail,
                board_state: packBoardState(board, nextMeta),
              });
            }
            setSelectedSquare(null);
            setValidMoves([]);
            return;
          }
        }

        newBoard[row][col] = piece;
        newBoard[selectedSquare.row][selectedSquare.col] = null;

        const nextTurn = currentTurn === "white" ? "black" : "white";

        const pieceSymbol = getPieceType(piece);
        const fromFile = FILES[selectedSquare.col];
        const toSquare = `${FILES[col]}${8 - row}`;
        // Notación algebraica estándar (SAN)
        const moveNotation = pieceSymbol === ''
          ? capturedPiece
            ? `${fromFile}x${toSquare}`   // peón captura: exd4
            : toSquare                     // peón avanza: e4
          : capturedPiece
            ? `${pieceSymbol}x${toSquare}` // pieza captura: Nxf3
            : `${pieceSymbol}${toSquare}`; // pieza mueve: Nf3
        const moveId = Date.now();
        const moveEntry = { move: moveNotation, player: currentTurn === "white" ? "Blancas" : "Negras" };
        nextMeta.lastMove = { id: moveId, notation: moveNotation, player: moveEntry.player };
        lastSeenMoveIdRef.current = moveId;
        const newHistory = [...moveHistory, moveEntry];
        setMoveHistory(newHistory);
        if (onMoveHistoryChange) onMoveHistoryChange(newHistory);

        try {
          if (capturedPiece && getPieceType(capturedPiece) === "K") {
            didAwardRef.current = false;
            await updateChessRoom(roomCodeRef.current, {
              board_state: packBoardState(newBoard, nextMeta),
              status: "finished",
              winner: user.email,
            });
          } else {
            await updateChessRoom(roomCodeRef.current, {
              board_state: packBoardState(newBoard, nextMeta),
              current_turn: nextTurn,
            });
          }

          setBoard(newBoard);
          setCurrentTurn(nextTurn);
          setClock(nextMeta.clock || null);
        } catch (e) {
          console.error(e);
        }

        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        const clickedPiece = board[row][col];
        if (clickedPiece && getPieceColor(clickedPiece) === playerColor) {
          setSelectedSquare({ row, col });
          setValidMoves(calculateValidMoves(board, row, col));
        } else {
          setSelectedSquare(null);
          setValidMoves([]);
        }
      }
    } else {
      const piece = board[row][col];
      if (piece && getPieceColor(piece) === playerColor) {
        setSelectedSquare({ row, col });
        setValidMoves(calculateValidMoves(board, row, col));
      }
    }
  };

  const ELO_RANGE = 300;

  const stopSearching = () => {
    setIsSearching(false);
    setSearchSeconds(0);
    if (matchPollRef.current) { clearInterval(matchPollRef.current); matchPollRef.current = null; }
    if (searchTimerRef.current) { clearInterval(searchTimerRef.current); searchTimerRef.current = null; }
  };

  useEffect(() => () => stopSearching(), []); // eslint-disable-line

  const autoJoinMatchmaking = async (matchRoomCode, role) => {
    setLoading(true);
    setError("");
    try {
      const room = await getChessRoom(matchRoomCode);
      if (!room) { setLoading(false); return; }

      roomCodeRef.current = matchRoomCode;
      lastUpdatedRef.current = room.updated_at;
      hostEmailRef.current = room.host_email;
      guestEmailRef.current = room.guest_email;
      didAwardRef.current = false;
      timeoutDeclaredRef.current = false;
      clockStartGuardRef.current = false;
      lastOfferSeenRef.current = null;

      const { board: b, meta } = safeParseBoardState(room.board_state);
      setBoard(b);
      metaRef.current = meta || {};
      setCurrentTurn(room.current_turn || "white");

      if (role === "host") {
        setRoomCode(matchRoomCode);
        setPlayerColor("white");
        setGameStatus("waiting");
        setScreen("playing");
        setWinner(null);
        startPolling();
      } else {
        const finalRoom = await updateChessRoom(matchRoomCode, {
          guest_avatar_url: user?.avatar_url || null,
          status: "playing",
        });
        lastUpdatedRef.current = finalRoom.updated_at;
        setRoomCode(matchRoomCode);
        setPlayerColor("black");
        setOpponentName(nickName(room.host_name) || "Rival");
        setGameStatus("playing");
        setScreen("playing");
        setWinner(null);
        startPolling();
      }
    } catch (e) {
      console.error(e);
      setError("Error al unirse a la partida");
    }
    setLoading(false);
  };

  const handleFindMatch = async (mode = "normal") => {
    if (!user) return;
    setIsSearching(true);
    setSearchSeconds(0);
    setError("");

    searchTimerRef.current = setInterval(() => setSearchSeconds((s) => s + 1), 1000);

    try {
      const result = await joinQueue(gameId, mode, myEloRating ?? 1200, timeKey);

      if (result.status === "matched") {
        stopSearching();
        autoJoinMatchmaking(result.room_code, result.role);
        return;
      }

      matchPollRef.current = setInterval(async () => {
        try {
          const status = await getMatchStatus();
          if (status.status === "matched") {
            stopSearching();
            autoJoinMatchmaking(status.room_code, status.role);
          } else if (status.status === "timeout" || status.status === "not_in_queue") {
            stopSearching();
            setError("Tiempo de búsqueda agotado. Inténtalo de nuevo.");
          }
        } catch {}
      }, 2000);
    } catch (e) {
      stopSearching();
      setError(e?.message || "Error al buscar partida");
    }
  };

  const handleCancelSearch = async () => {
    stopSearching();
    try { await cancelSearch(); } catch {}
  };

  const checkEloCompatibility = (roomHostElo, roomMode) => {
    if (roomMode !== 'ranked') return true;
    return Math.abs((myEloRating ?? 1200) - (roomHostElo ?? 1200)) <= ELO_RANGE;
  };

  const handleCreateRoom = async (mode = 'normal') => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const minutes = TIME_LIMITS.find((t) => t.key === timeKey)?.minutes ?? 0;

      const meta = {
        drawOfferBy: null,
        drawOfferAt: null,
        clock: initClockFromMinutes(minutes),
      };

      const room = await createChessRoom({
        room_code: code,
        host_email: user.email,
        host_name: nickName(user.full_name) || user.email.split("@")[0],
        host_avatar_url: user.avatar_url || null,
        status: "waiting",
        board_state: packBoardState(initBoard(), meta),
        current_turn: "white",
        game_mode: mode,
        host_elo: myEloRating ?? 1200,
      });

      roomCodeRef.current = code;
      lastUpdatedRef.current = room.updated_at;

      hostEmailRef.current = user.email;
      guestEmailRef.current = null;

      didAwardRef.current = false;
      timeoutDeclaredRef.current = false;
      clockStartGuardRef.current = false;

      metaRef.current = meta;
      lastOfferSeenRef.current = null;

      setRoomCode(code);
      setPlayerColor("white");
      setScreen("playing");
      setGameStatus("waiting");
      setWinner(null);
      setDrawOfferBy(null);
      setClock(meta.clock);

      startPolling();
    } catch (e) {
      console.error(e);
      setError("Error al crear sala");
    }

    setLoading(false);
  };

  const handleJoinRoom = async () => {
    if (!user || !joinCode.trim()) return;
    setLoading(true);
    setError("");

    try {
      const room = await getChessRoom(joinCode.toUpperCase());
      if (!room || room.status !== "waiting") {
        setError("Sala no encontrada o ya empezada");
        setLoading(false);
        return;
      }

      if (!checkEloCompatibility(room.host_elo, room.game_mode)) {
        setError(`Sala clasificatoria: diferencia de ELO demasiado grande (±${ELO_RANGE}). Busca una sala Normal o juega con alguien de tu nivel.`);
        setLoading(false);
        return;
      }

      const updatedRoom = await updateChessRoom(joinCode.toUpperCase(), {
        guest_email: user.email,
        guest_name: nickName(user.full_name) || user.email.split("@")[0],
        guest_avatar_url: user.avatar_url || null,
        status: "playing",
      });

      roomCodeRef.current = joinCode.toUpperCase();
      lastUpdatedRef.current = updatedRoom.updated_at;

      hostEmailRef.current = room.host_email;
      guestEmailRef.current = user.email;

      didAwardRef.current = false;
      timeoutDeclaredRef.current = false;
      clockStartGuardRef.current = false;
      lastOfferSeenRef.current = null;

      setRoomCode(joinCode.toUpperCase());
      setPlayerColor("black");
      setOpponentName(room.host_name || "Rival");
      setGameStatus("playing");
      setScreen("playing");
      setWinner(null);

      const { board: b, meta } = safeParseBoardState(room.board_state);
      setBoard(b);
      metaRef.current = meta || {};
      setDrawOfferBy(meta?.drawOfferBy || null);
      setClock(meta?.clock || null);
      setCurrentTurn(room.current_turn || "white");

      startPolling();
    } catch (e) {
      console.error(e);
      setError("Error al unirse a la sala");
    }

    setLoading(false);
  };

  const handleOfferDraw = async () => {
    if (!user || gameStatus !== "playing" || !roomCodeRef.current) return;

    const meta = { ...(metaRef.current || {}) };

    if (meta.drawOfferBy) {
      if (meta.drawOfferBy === user.email) {
        meta.drawOfferBy = null;
        meta.drawOfferAt = null;
        metaRef.current = meta;

        await updateChessRoom(roomCodeRef.current, { board_state: packBoardState(board, meta) });
        toast.message("Oferta de tablas cancelada");
      } else {
        setIncomingDrawOpen(true);
      }
      return;
    }

    meta.drawOfferBy = user.email;
    meta.drawOfferAt = nowISO();
    metaRef.current = meta;

    await updateChessRoom(roomCodeRef.current, { board_state: packBoardState(board, meta) });
    toast.message("Tablas ofrecidas");
  };

  const handleAcceptDraw = async () => {
    if (!roomCodeRef.current) return;

    const meta = { ...(metaRef.current || {}) };
    meta.drawOfferBy = null;
    meta.drawOfferAt = null;
    metaRef.current = meta;

    didAwardRef.current = false;

    await updateChessRoom(roomCodeRef.current, {
      board_state: packBoardState(board, meta),
      status: "finished",
      winner: "draw",
    });

    setIncomingDrawOpen(false);
  };

  const handleDeclineDraw = async () => {
    if (!roomCodeRef.current) return;

    const meta = { ...(metaRef.current || {}) };
    meta.drawOfferBy = null;
    meta.drawOfferAt = null;
    metaRef.current = meta;

    await updateChessRoom(roomCodeRef.current, { board_state: packBoardState(board, meta) });

    setIncomingDrawOpen(false);
    toast.message("Tablas rechazadas");
  };

  const handleConfirmLeave = async () => {
    setLeaveOpen(false);

    const doLeave = () => { if (onLeave) onLeave(); else resetLocal(); };

    try {
      if (!roomCodeRef.current) { doLeave(); return; }

      if (gameStatus === "waiting") {
        await deleteChessRoom(roomCodeRef.current);
        toast.message("Sala cerrada");
        doLeave();
        return;
      }

      const hostEmail = hostEmailRef.current;
      const guestEmail = guestEmailRef.current;
      const opponentEmail = user?.email === hostEmail ? guestEmail : hostEmail;

      if (gameStatus === "playing" && opponentEmail) {
        // Penalización por abandono
        const penalty = await recordAbandon().catch(() => null);
        if (penalty?.type === 'warning') {
          await showWarning(penalty.message);
        } else if (penalty?.type === 'ban') {
          toast.error(penalty.message, { duration: 8000 });
        }

        didAwardRef.current = false;
        await updateChessRoom(roomCodeRef.current, {
          status: "finished",
          winner: opponentEmail,
          board_state: packBoardState(board, { ...(metaRef.current || {}), drawOfferBy: null, drawOfferAt: null }),
        });
      } else if (opponentEmail) {
        // Partida ya terminada, solo salir
        doLeave();
        return;
      } else {
        await deleteChessRoom(roomCodeRef.current);
      }
    } catch (e) {
      console.error(e);
    }

    doLeave();
  };

  const resetLocal = () => {
    stopSync();
    setScreen("lobby");
    setRoomCode("");
    setJoinCode("");
    setBoard(initBoard());
    setPlayerColor(null);
    setCurrentTurn("white");
    setSelectedSquare(null);
    setValidMoves([]);
    setGameStatus("waiting");
    setWinner(null);
    setDrawOfferBy(null);
    setClock(null);
    setOpponentName("Rival");
    setMoveHistory([]);
    if (onMoveHistoryChange) {
      onMoveHistoryChange([]);
    }

    roomCodeRef.current = null;
    lastUpdatedRef.current = null;
    metaRef.current = {};
    didAwardRef.current = false;
    lastOfferSeenRef.current = null;

    hostEmailRef.current = null;
    guestEmailRef.current = null;
    clockStartGuardRef.current = false;
    timeoutDeclaredRef.current = false;
    lastSeenMoveIdRef.current = null;
    didSyncNameRef.current = false;
  };

  if (screen === "lobby") {
    return (
      <OnlineGameLobby
        title="♔ Ajedrez Online ♚"
        description="Juega en tiempo real con otro jugador"
        timeLimits={TIME_LIMITS}
        selectedTimeKey={timeKey}
        onTimeChange={setTimeKey}
        onCreateRoom={handleCreateRoom}
        onFindMatch={handleFindMatch}
        isSearching={isSearching}
        searchSeconds={searchSeconds}
        onCancelSearch={handleCancelSearch}
        loading={loading}
        error={error}
      />
    );
  }

  const flip = playerColor === "black";
  const canInteract = gameStatus === "playing" && currentTurn === playerColor;

  const display = getDisplayedMs(clock, currentTurn, nowMs);
  const myMs = playerColor === "white" ? display.white : display.black;
  const oppMs = playerColor === "white" ? display.black : display.white;

  const finishedLabel =
    winner === "draw" ? "Tablas" : winner === user?.email ? "¡Victoria!" : "Derrota";

  const drawPill =
    drawOfferBy && gameStatus === "playing"
      ? drawOfferBy === user?.email
        ? "Has ofrecido tablas"
        : "Tu rival ofrece tablas"
      : null;

  const isTopPlayerActive = flip ? currentTurn === "white" : currentTurn === "black";
  const isBottomPlayerActive = flip ? currentTurn === "black" : currentTurn === "white";

  return (
    <div className="flex flex-col items-center gap-3 p-2 sm:p-4 w-full">
      <OnlineGamePlayerZone
        topPlayer={{
          label: flip ? "Blancas" : "Negras",
          name: opponentName,
          time: formatMs(clock ? Math.max(0, oppMs) : null),
          avatarUrl: opponentAvatarUrl,
          elo: opponentEloRating,
        }}
        bottomPlayer={{
          label: flip ? "Negras" : "Blancas",
          name: nickName(user?.full_name) || "Tú",
          time: formatMs(clock ? Math.max(0, myMs) : null),
          avatarUrl: user?.avatar_url || null,
          elo: myEloRating,
        }}
        isTopPlayerActive={isTopPlayerActive}
        isBottomPlayerActive={isBottomPlayerActive}
        onSettingsClick={() => setSettingsOpen(true)}
        centerContent={
          gameStatus === "waiting" && roomCode ? (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-6 py-3">
              <p className="text-sm text-gray-300 mb-2">Comparte el código con tu rival:</p>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold tracking-widest text-cyan-400">{roomCode}</div>
                <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(roomCode); toast.success("Código copiado"); }} className="text-gray-400 hover:text-white">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : null
        }
      />

      {gameStatus === "waiting" && <div className="text-sm text-gray-400">Esperando rival...</div>}

      {drawPill && (
        <div className="text-xs text-gray-300 bg-white/5 border border-white/10 rounded-full px-4 py-1">
          {drawPill}
        </div>
      )}

      {gameStatus === "finished" && (
        <div className="bg-white/10 rounded-lg px-6 py-3 flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <span className="font-semibold">{finishedLabel}</span>
        </div>
      )}

      <div className="relative" style={{ width: "min(480px, 90vw)", aspectRatio: "1/1" }}>
        {showTurnFlash && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div
              className="bg-black/70 backdrop-blur-sm text-white px-6 py-3 rounded-xl text-base font-bold border border-white/20 shadow-xl"
              style={{ animation: "fadeOutTurn 1.5s ease-out forwards" }}
            >
              {isBottomPlayerActive ? "Tu turno" : `Turno de ${opponentName}`}
            </div>
          </div>
        )}
      <div className="grid grid-cols-8 border-2 border-white/10 rounded-lg overflow-hidden shadow-2xl w-full h-full">
        {Array.from({ length: 8 }).map((_, ri) => {
          const row = flip ? 7 - ri : ri;
          return Array.from({ length: 8 }).map((_, ci) => {
            const col = flip ? 7 - ci : ci;
            const piece = board[row][col];

            const isLight = (row + col) % 2 === 0;
            const isSelected = selectedSquare?.row === row && selectedSquare?.col === col;
            const isValidMove = validMoves.some((m) => m.row === row && m.col === col);

            const bg = isLight ? theme.light : theme.dark;
            const labelColor = isLight ? theme.labelLight : theme.labelDark;

            return (
              <div
                key={`${row}-${col}`}
                onClick={() => (canInteract ? handleSquareClick(row, col) : null)}
                className={`aspect-square flex items-center justify-center relative overflow-hidden ${canInteract ? "cursor-pointer hover:brightness-110" : "cursor-default"} ${isSelected ? "ring-4 ring-yellow-400 ring-inset" : ""}`}
                style={{ backgroundColor: bg }}
              >
                {piece && renderPieceNode(piece, pieceSet)}

                {isValidMove && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {piece ? <div className="w-[85%] h-[85%] rounded-full border-4 border-black/25" /> : <div className="w-4 h-4 rounded-full bg-black/25" />}
                  </div>
                )}

                {((!flip && ci === 0) || (flip && ci === 7)) && (
                  <span className="absolute top-1 left-1 text-xs font-bold" style={{ color: labelColor, opacity: 0.8 }}>
                    {8 - row}
                  </span>
                )}
                {((!flip && ri === 7) || (flip && ri === 0)) && (
                  <span className="absolute bottom-1 right-1 text-xs font-bold" style={{ color: labelColor, opacity: 0.8 }}>
                    {FILES[col]}
                  </span>
                )}
              </div>
            );
          });
        })}
      </div>
      </div>

      <div className="flex gap-3">
        {gameStatus === "playing" && (
          <Button onClick={handleOfferDraw} variant="outline" className="border-white/10 text-gray-200">
            <Scale className="w-4 h-4 mr-2" />
            {drawOfferBy === user?.email ? "Cancelar tablas" : "Ofrecer tablas"}
          </Button>
        )}

        <Button onClick={() => setLeaveOpen(true)} variant="secondary">
          <LogOut className="w-4 h-4 mr-2" />
          {gameStatus === "finished" ? "Volver" : "Salir"}
        </Button>
      </div>

      {/* Tablas */}
      <AlertDialog open={incomingDrawOpen} onOpenChange={setIncomingDrawOpen}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Oferta de tablas</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Si aceptas, la partida termina sin ganador y nadie suma puntos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={handleDeclineDraw}>
              Rechazar
            </AlertDialogCancel>
            <AlertDialogAction className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90" onClick={handleAcceptDraw}>
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Salir */}
      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir de la partida?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {gameStatus === "playing"
                ? "Si sales ahora, se considerará abandono, tu rival ganará y recibirás una penalización."
                : "Volverás al lobby."}
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

      {/* Personalizar */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white w-[980px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Personalizar</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="piezas" className="w-full">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="tableros">Tableros</TabsTrigger>
              <TabsTrigger value="piezas">Piezas</TabsTrigger>
            </TabsList>

            <TabsContent value="tableros" className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(BOARD_THEMES).map(([k, v]) => {
                  const selected = k === boardTheme;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setBoardTheme(k)}
                      className={`relative rounded-lg border p-3 bg-white/5 hover:bg-white/10 transition
                        ${selected ? "border-green-500/60 ring-2 ring-green-500/30" : "border-white/10"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{v.label}</span>
                        <div className="flex gap-1">
                          <span className="w-4 h-4 rounded" style={{ backgroundColor: v.light }} />
                          <span className="w-4 h-4 rounded" style={{ backgroundColor: v.dark }} />
                        </div>
                      </div>

                      {selected && (
                        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-green-500/25 border border-green-500/60 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-400" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="piezas" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
                <div className="max-h-[430px] overflow-y-auto overflow-x-hidden pr-2">
                  <div className="grid [grid-template-columns:repeat(auto-fill,minmax(76px,1fr))] gap-2">
                    {PIECE_SETS.map((s) => {
                      const selected = s.key === pieceSet;
                      const kUrl = getPieceDataUri(s.key, "wK");
                      const qUrl = getPieceDataUri(s.key, "wQ");
                      const nUrl = getPieceDataUri(s.key, "wN");

                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setPieceSet(s.key)}
                          className={`relative rounded-lg border p-1.5 bg-white/5 hover:bg-white/10 transition min-h-[52px] min-w-[76px] overflow-hidden
                            ${selected ? "border-green-500/60 ring-2 ring-green-500/30" : "border-white/10"}`}
                          title={s.label}
                        >
                          <div className="flex items-center justify-center gap-0.5">
                            {kUrl ? <img className="w-6 h-6" src={kUrl} alt="" /> : <span className="text-xl">♔</span>}
                            {qUrl ? <img className="w-6 h-6" src={qUrl} alt="" /> : <span className="text-xl">♕</span>}
                            {nUrl ? <img className="w-6 h-6" src={nUrl} alt="" /> : <span className="text-xl">♘</span>}
                          </div>

                          {selected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-green-500/25 border border-green-500/60 flex items-center justify-center">
                                <Check className="w-5 h-5 text-green-400" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-gray-400 mb-2">Vista previa</p>
                  <div className="grid grid-cols-3 gap-2 place-items-center">
                    <div className="w-20 h-20 flex items-center justify-center">{renderPieceNode("wK", pieceSet)}</div>
                    <div className="w-20 h-20 flex items-center justify-center">{renderPieceNode("wQ", pieceSet)}</div>
                    <div className="w-20 h-20 flex items-center justify-center">{renderPieceNode("wN", pieceSet)}</div>
                    <div className="w-20 h-20 flex items-center justify-center">{renderPieceNode("bK", pieceSet)}</div>
                    <div className="w-20 h-20 flex items-center justify-center">{renderPieceNode("bQ", pieceSet)}</div>
                    <div className="w-20 h-20 flex items-center justify-center">{renderPieceNode("bN", pieceSet)}</div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-3">
                    Consejo: si quieres que se vean bien en cualquier tablero, usa "Staunton 3D" o "Graphite".
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setSettingsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
