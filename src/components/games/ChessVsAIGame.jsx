import React, { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createChessRoom, getChessRoom, updateChessRoom, deleteChessRoom, requestAiMove, requestGameSummary } from "@/api/chess";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, LogOut, Trophy, Bot, Check } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initBoard, safeParseBoardState, packBoardState, FILES, getPieceColor, getPieceType } from "@/components/chess/chessState";
import { getLegalMoves, isSquareAttacked } from "@/components/chess/chessMoves";
import { PIECE_SETS, renderPieceNode, getPieceDataUri } from "@/components/chess/chessPieces";
import OnlineGamePlayerZone from "@/components/games/OnlineGamePlayerZone";

const BOARD_THEMES = {
  classic: { label: "Clásico", light: "#F0D9B5", dark: "#B58863", labelLight: "#B58863", labelDark: "#F0D9B5" },
  blue:    { label: "Azul",    light: "#E8EDF9", dark: "#4B7399", labelLight: "#4B7399", labelDark: "#E8EDF9" },
  green:   { label: "Verde",   light: "#EEEED2", dark: "#769656", labelLight: "#769656", labelDark: "#EEEED2" },
  dark:    { label: "Oscuro",  light: "#3A3A3A", dark: "#1F1F1F", labelLight: "#D0D0D0", labelDark: "#B0B0B0" },
};

const DIFFICULTY_LABELS = { 1: "Principiante", 2: "Intermedio", 3: "Avanzado", 4: "Maestro" };
const DIFFICULTY_COLORS = { 1: "#22c55e", 2: "#3b82f6", 3: "#f59e0b", 4: "#ef4444" };

function squareToCoords(sq) {
  const col = sq.charCodeAt(0) - 97;
  const row = 8 - parseInt(sq[1]);
  return { row, col };
}

function coordsToSquare(row, col) {
  return `${FILES[col]}${8 - row}`;
}

function buildVsAiIntroMessage(difficulty) {
  return { type: "info", text: `Juegas con blancas contra el entrenador (${DIFFICULTY_LABELS[difficulty]}).` };
}

function mapWinnerToResult(winner, userEmail) {
  if (!winner) return null;
  if (winner === userEmail) return "player_wins";
  if (winner === "ai") return "ai_wins";
  if (winner === "draw") return "draw";
  return null;
}

function mapResultToWinner(result, userEmail) {
  if (result === "player_wins") return userEmail;
  if (result === "ai_wins") return "ai";
  if (result === "draw") return "draw";
  return undefined;
}

export default function ChessVsAIGame({
  user,
  difficulty = 2,
  initialRoomCode = null,
  onLeave,
  onMoveHistoryChange,
  onCoachMessage,
  onAnalysisLoadingChange,
}) {
  const queryClient = useQueryClient();
  const [board, setBoard] = useState(initBoard());
  const [currentTurn, setCurrentTurn] = useState("white");
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [gameStatus, setGameStatus] = useState("playing");
  const [winner, setWinner] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [boardTheme, setBoardTheme] = useState(() => localStorage.getItem("chess_board_theme") || "classic");
  const [pieceSet, setPieceSet] = useState(() => localStorage.getItem("chess_piece_set") || "staunton");
  const [moveHistory, setMoveHistory] = useState([]);
  const [roomReady, setRoomReady] = useState(false);
  const [playerInCheck, setPlayerInCheck] = useState(false);

  const movePairsRef = useRef([]);
  const moveHistoryRef = useRef([]);
  const coachMessagesRef = useRef([buildVsAiIntroMessage(difficulty)]);
  const roomCodeRef = useRef(null);
  const boardRef = useRef(initBoard());
  const gameOverRef = useRef(false);
  const playerInCheckRef = useRef(false);
  const autoResumeAttemptedRef = useRef(false);
  const onLeaveRef = useRef(onLeave);

  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  useEffect(() => { localStorage.setItem("chess_board_theme", boardTheme); }, [boardTheme]);
  useEffect(() => { localStorage.setItem("chess_piece_set", pieceSet); }, [pieceSet]);

  const setHistoryState = useCallback((nextHistory) => {
    moveHistoryRef.current = nextHistory;
    setMoveHistory(nextHistory);
    onMoveHistoryChange?.(nextHistory);
  }, [onMoveHistoryChange]);

  const setCheckState = useCallback((inCheck) => {
    playerInCheckRef.current = inCheck;
    setPlayerInCheck(inCheck);
  }, []);

  const detectWhiteCheck = useCallback((boardState) => {
    let wKr = -1;
    let wKc = -1;

    outer: for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (boardState[r][c] === "wK") {
          wKr = r;
          wKc = c;
          break outer;
        }
      }
    }

    return wKr !== -1 && isSquareAttacked(boardState, wKr, wKc, "black");
  }, []);

  const syncRoomState = useCallback(async ({
    boardState = boardRef.current,
    turn,
    status = gameStatus,
    winnerValue,
    movePairs = movePairsRef.current,
    moveHistoryValue = moveHistoryRef.current,
    playerInCheckValue = playerInCheckRef.current,
    coachMessages = coachMessagesRef.current,
  } = {}) => {
    if (!roomCodeRef.current || roomCodeRef.current.startsWith("LOCAL_")) return;

    const payload = {
      board_state: packBoardState(boardState, {
        movePairs,
        moveHistory: moveHistoryValue,
        coachMessages,
        playerInCheck: playerInCheckValue,
      }),
      status,
    };

    if (turn) payload.current_turn = turn;
    if (winnerValue !== undefined) payload.winner = winnerValue;

    await updateChessRoom(roomCodeRef.current, payload).catch(() => {});
  }, [gameStatus]);

  const pushCoachMessage = useCallback((type, text, { persist = true } = {}) => {
    const nextMessages = [...coachMessagesRef.current, { type, text }];
    coachMessagesRef.current = nextMessages;
    onCoachMessage?.(type, text);
    if (persist) syncRoomState({ coachMessages: nextMessages });
    return nextMessages;
  }, [onCoachMessage, syncRoomState]);

  const applyAiMove = useCallback((boardState, aiFrom, aiTo, aiPromotion) => {
    const fromC = squareToCoords(aiFrom);
    const toC = squareToCoords(aiTo);
    const newBoard = boardState.map(r => [...r]);
    let piece = newBoard[fromC.row][fromC.col];

    if (aiPromotion && getPieceType(piece) === "P") {
      piece = "b" + aiPromotion.toUpperCase();
    }

    newBoard[toC.row][toC.col] = piece;
    newBoard[fromC.row][fromC.col] = null;

    if (piece && getPieceType(piece) === "K" && Math.abs(toC.col - fromC.col) === 2) {
      const kingside = toC.col > fromC.col;
      const rookFromCol = kingside ? 7 : 0;
      const rookToCol = kingside ? toC.col - 1 : toC.col + 1;
      newBoard[fromC.row][rookToCol] = getPieceColor(piece) === "white" ? "wR" : "bR";
      newBoard[fromC.row][rookFromCol] = null;
    }

    return newBoard;
  }, []);

  const handleGameOver = useCallback(async (
    result,
    finalMovePairs,
    finalHistory,
    finalBoard = boardRef.current,
    finalPlayerInCheck = playerInCheckRef.current
  ) => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;

    setGameStatus("finished");
    setCurrentTurn(null);
    setSelectedSquare(null);
    setValidMoves([]);
    setAiThinking(false);
    setWinner(result);

    const winnerValue = mapResultToWinner(result, user?.email);
    await syncRoomState({
      boardState: finalBoard,
      status: "finished",
      winnerValue,
      movePairs: finalMovePairs,
      moveHistoryValue: finalHistory,
      playerInCheckValue: finalPlayerInCheck,
    });

    onAnalysisLoadingChange?.(true);
    onCoachMessage?.("info", "Analizando la partida...");

    let nextMessages = coachMessagesRef.current;

    try {
      const analysis = await requestGameSummary(roomCodeRef.current, finalMovePairs, result);
      if (analysis.accuracy !== null && analysis.accuracy !== undefined) {
        const summary = `Precisión: ${analysis.accuracy}% · Blunders: ${analysis.blunders} · Errores: ${analysis.mistakes} · Imprecisiones: ${analysis.inaccuracies}`;
        nextMessages = [...nextMessages, { type: "analysis", text: summary }];
        onCoachMessage?.("analysis", summary);
      }
      if (analysis.feedback) {
        nextMessages = [...nextMessages, { type: "coach", text: analysis.feedback }];
        onCoachMessage?.("coach", analysis.feedback);
      }
    } catch {
      const fallback = "Análisis no disponible.";
      nextMessages = [...nextMessages, { type: "info", text: fallback }];
      onCoachMessage?.("info", fallback);
    }

    coachMessagesRef.current = nextMessages;

    await syncRoomState({
      boardState: finalBoard,
      status: "finished",
      winnerValue,
      movePairs: finalMovePairs,
      moveHistoryValue: finalHistory,
      playerInCheckValue: finalPlayerInCheck,
      coachMessages: nextMessages,
    });

    queryClient.invalidateQueries({ queryKey: ['myActiveChessGames'] });
    onAnalysisLoadingChange?.(false);
  }, [onAnalysisLoadingChange, onCoachMessage, queryClient, syncRoomState, user?.email]);

  const resolveAiTurn = useCallback(async ({
    boardAfterPlayer,
    movePairsAfterPlayer,
    historyAfterPlayer,
    previousState = null,
  }) => {
    movePairsRef.current = movePairsAfterPlayer;
    setCurrentTurn("black");
    setAiThinking(true);

    await syncRoomState({
      boardState: boardAfterPlayer,
      turn: "black",
      status: "playing",
      movePairs: movePairsAfterPlayer,
      moveHistoryValue: historyAfterPlayer,
      playerInCheckValue: false,
    });

    try {
      const result = await requestAiMove(roomCodeRef.current, movePairsAfterPlayer);

      if (result.isGameOver) {
        let finalBoard = boardAfterPlayer;
        let finalMovePairs = movePairsAfterPlayer;
        let finalHistory = historyAfterPlayer;

        if (result.aiMove) {
          const { from: aiFrom, to: aiTo, san: aiSan, promotion: aiPromo } = result.aiMove;
          finalMovePairs = [...movePairsAfterPlayer, { from: aiFrom, to: aiTo, ...(aiPromo && { promotion: aiPromo }) }];
          movePairsRef.current = finalMovePairs;

          finalBoard = applyAiMove(boardAfterPlayer, aiFrom, aiTo, aiPromo);
          finalHistory = [...historyAfterPlayer, { move: aiSan || `${aiFrom}-${aiTo}`, player: "Negras" }];

          boardRef.current = finalBoard;
          setBoard(finalBoard);
          setHistoryState(finalHistory);
        }

        const finalInCheck = detectWhiteCheck(finalBoard);
        setCheckState(finalInCheck);
        setAiThinking(false);

        const outcome = result.result ?? "draw";
        if (outcome === "player_wins") pushCoachMessage("success", "¡Jaque mate! Has ganado.");
        else if (outcome === "draw") pushCoachMessage("info", "Tablas.");

        await handleGameOver(outcome, finalMovePairs, finalHistory, finalBoard, finalInCheck);
        return;
      }

      const { from: aiFrom, to: aiTo, san: aiSan, promotion: aiPromo } = result.aiMove;
      const aiMovePairs = [...movePairsAfterPlayer, { from: aiFrom, to: aiTo, ...(aiPromo && { promotion: aiPromo }) }];
      movePairsRef.current = aiMovePairs;

      const aiBoard = applyAiMove(boardAfterPlayer, aiFrom, aiTo, aiPromo);
      const aiHistory = [...historyAfterPlayer, { move: aiSan || `${aiFrom}-${aiTo}`, player: "Negras" }];
      const inCheck = detectWhiteCheck(aiBoard);

      boardRef.current = aiBoard;
      setBoard(aiBoard);
      setHistoryState(aiHistory);
      setCheckState(inCheck);
      setAiThinking(false);
      setCurrentTurn("white");

      await syncRoomState({
        boardState: aiBoard,
        turn: "white",
        status: "playing",
        movePairs: aiMovePairs,
        moveHistoryValue: aiHistory,
        playerInCheckValue: inCheck,
      });

      if (inCheck) {
        pushCoachMessage("error", "¡Jaque! Mueve tu rey para salir del peligro.");
      }
    } catch (e) {
      setAiThinking(false);

      if (previousState) {
        boardRef.current = previousState.board;
        movePairsRef.current = previousState.movePairs;
        setBoard(previousState.board);
        setHistoryState(previousState.history);
        setCheckState(previousState.playerInCheck);
        setCurrentTurn("white");

        await syncRoomState({
          boardState: previousState.board,
          turn: "white",
          status: "playing",
          movePairs: previousState.movePairs,
          moveHistoryValue: previousState.history,
          playerInCheckValue: previousState.playerInCheck,
        });
      }

      const errMsg = e?.response?.data?.error || e?.message || "";
      if (errMsg === "invalid_move") {
        toast.error("Movimiento ilegal. Tu rey quedaría en jaque.");
      } else if (previousState) {
        toast.error("El entrenador no pudo responder. Inténtalo de nuevo.");
      } else {
        toast.error("No se pudo reanudar el turno del entrenador.");
      }
    }
  }, [applyAiMove, detectWhiteCheck, handleGameOver, pushCoachMessage, setCheckState, setHistoryState, syncRoomState]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      const introMessage = buildVsAiIntroMessage(difficulty);
      coachMessagesRef.current = [introMessage];

      try {
        if (initialRoomCode) {
          try {
            const room = await getChessRoom(initialRoomCode);
            if (!cancelled && room?.is_vs_ai && room.host_email === user?.email) {
              const { board: savedBoard, meta } = safeParseBoardState(room.board_state);
              const savedHistory = Array.isArray(meta?.moveHistory) ? meta.moveHistory : [];
              const savedMovePairs = Array.isArray(meta?.movePairs) ? meta.movePairs : [];
              const savedCoachMessages = Array.isArray(meta?.coachMessages) && meta.coachMessages.length
                ? meta.coachMessages
                : [buildVsAiIntroMessage(room.ai_difficulty ?? difficulty)];

              roomCodeRef.current = room.room_code;
              boardRef.current = savedBoard;
              movePairsRef.current = savedMovePairs;
              moveHistoryRef.current = savedHistory;
              coachMessagesRef.current = savedCoachMessages;
              gameOverRef.current = room.status === "finished";
              autoResumeAttemptedRef.current = false;

              setBoard(savedBoard);
              setHistoryState(savedHistory);
              setCheckState(!!meta?.playerInCheck);
              setSelectedSquare(null);
              setValidMoves([]);
              setCurrentTurn(room.status === "finished" ? null : (room.current_turn || "white"));
              setGameStatus(room.status === "waiting" ? "playing" : room.status);
              setWinner(mapWinnerToResult(room.winner, user?.email));
              setAiThinking(false);
              setRoomReady(true);
              return;
            }
          } catch {
            if (!cancelled) {
              onLeaveRef.current?.();
            }
            return;
          }

          if (!cancelled) {
            onLeaveRef.current?.();
          }
          return;
        }

        const code = Math.random().toString(36).substring(2, 8).toUpperCase() + "A";
        await createChessRoom({
          room_code: code,
          board_state: packBoardState(initBoard(), {
            movePairs: [],
            moveHistory: [],
            coachMessages: [introMessage],
            playerInCheck: false,
          }),
          game_mode: "vsai",
          is_vs_ai: true,
          ai_difficulty: difficulty,
          status: "playing",
          current_turn: "white",
        });

        if (!cancelled) roomCodeRef.current = code;
      } catch {
        if (!cancelled) {
          roomCodeRef.current = "LOCAL_" + Math.random().toString(36).substring(2, 6).toUpperCase();
        }
      }

      if (cancelled) return;

      boardRef.current = initBoard();
      movePairsRef.current = [];
      moveHistoryRef.current = [];
      gameOverRef.current = false;
      autoResumeAttemptedRef.current = false;
      coachMessagesRef.current = [introMessage];

      setBoard(initBoard());
      setHistoryState([]);
      setCheckState(false);
      setSelectedSquare(null);
      setValidMoves([]);
      setWinner(null);
      setCurrentTurn("white");
      setGameStatus("playing");
      setAiThinking(false);
      setRoomReady(true);
    };

    setup();
    return () => { cancelled = true; };
  }, [difficulty, initialRoomCode, setCheckState, setHistoryState, user?.email]);

  useEffect(() => {
    if (!roomReady) return;
    if (gameStatus !== "playing") return;
    if (currentTurn !== "black") return;
    if (aiThinking) return;
    if (gameOverRef.current) return;
    if (autoResumeAttemptedRef.current) return;

    autoResumeAttemptedRef.current = true;
    resolveAiTurn({
      boardAfterPlayer: boardRef.current,
      movePairsAfterPlayer: movePairsRef.current,
      historyAfterPlayer: moveHistoryRef.current,
      previousState: null,
    });
  }, [aiThinking, currentTurn, gameStatus, resolveAiTurn, roomReady]);

  const handleSquareClick = async (row, col) => {
    if (gameStatus !== "playing" || currentTurn !== "white" || aiThinking) return;
    if (!roomReady) {
      toast.error("Preparando partida, espera un momento...");
      return;
    }

    if (selectedSquare) {
      const isValid = validMoves.some(m => m.row === row && m.col === col);

      if (isValid) {
        const prevState = {
          board: boardRef.current,
          movePairs: [...movePairsRef.current],
          history: [...moveHistoryRef.current],
          playerInCheck: playerInCheckRef.current,
        };

        const newBoard = board.map(r => [...r]);
        const piece = newBoard[selectedSquare.row][selectedSquare.col];
        const captured = newBoard[row][col];
        let movedPiece = piece;
        if (getPieceType(piece) === "P" && row === 0) movedPiece = "wQ";

        newBoard[row][col] = movedPiece;
        newBoard[selectedSquare.row][selectedSquare.col] = null;

        const fromSq = coordsToSquare(selectedSquare.row, selectedSquare.col);
        const toSq = coordsToSquare(row, col);
        const isPromotion = getPieceType(piece) === "P" && row === 0;
        const newMovePairs = [...prevState.movePairs, { from: fromSq, to: toSq, ...(isPromotion && { promotion: "q" }) }];

        const sym = getPieceType(piece);
        const fromFile = FILES[selectedSquare.col];
        const toNotation = `${FILES[col]}${8 - row}`;
        const notation = sym === ""
          ? (captured ? `${fromFile}x${toNotation}` : toNotation)
          : (captured ? `${sym}x${toNotation}` : `${sym}${toNotation}`);
        const fullNotation = isPromotion ? notation + "=Q" : notation;

        const newHistory = [...moveHistoryRef.current, { move: fullNotation, player: "Blancas" }];

        boardRef.current = newBoard;
        setBoard(newBoard);
        setHistoryState(newHistory);
        setSelectedSquare(null);
        setValidMoves([]);
        setCheckState(false);
        autoResumeAttemptedRef.current = false;

        if (captured && getPieceType(captured) === "K") {
          movePairsRef.current = newMovePairs;
          await handleGameOver("player_wins", newMovePairs, newHistory, newBoard, false);
          return;
        }

        await resolveAiTurn({
          boardAfterPlayer: newBoard,
          movePairsAfterPlayer: newMovePairs,
          historyAfterPlayer: newHistory,
          previousState: prevState,
        });
      } else {
        const clickedPiece = board[row][col];
        if (clickedPiece && getPieceColor(clickedPiece) === "white") {
          setSelectedSquare({ row, col });
          setValidMoves(getLegalMoves(board, row, col));
        } else {
          setSelectedSquare(null);
          setValidMoves([]);
        }
      }
    } else {
      const piece = board[row][col];
      if (piece && getPieceColor(piece) === "white") {
        setSelectedSquare({ row, col });
        setValidMoves(getLegalMoves(board, row, col));
      }
    }
  };

  const handleLeave = async () => {
    if (roomCodeRef.current) {
      const roomCode = roomCodeRef.current;
      await deleteChessRoom(roomCodeRef.current).catch(() => {});
      roomCodeRef.current = null;
      queryClient.setQueryData(['myActiveChessGames'], (prev = []) =>
        Array.isArray(prev) ? prev.filter(game => game.room_code !== roomCode) : []
      );
      queryClient.invalidateQueries({ queryKey: ['myActiveChessGames'] });
    }
    onLeave?.();
  };

  const theme = BOARD_THEMES[boardTheme] || BOARD_THEMES.classic;
  const diffColor = DIFFICULTY_COLORS[difficulty] || "#8b5cf6";

  const finishedLabel =
    winner === "player_wins" ? "¡Victoria!" :
    winner === "ai_wins" ? "Derrota" :
    winner === "draw" ? "Tablas" : "";

  return (
    <div className="flex flex-col items-center gap-3 p-2 sm:p-4 w-full">
      <OnlineGamePlayerZone
        topPlayer={{
          label: "Negras",
          name: `Entrenador (${DIFFICULTY_LABELS[difficulty]})`,
          time: null,
          avatarUrl: null,
          elo: null,
          isPremium: false,
          customIcon: <Bot className="w-4 h-4" style={{ color: diffColor }} />,
        }}
        bottomPlayer={{
          label: "Blancas",
          name: user?.full_name?.split("@")[0] || "Tú",
          time: null,
          avatarUrl: user?.avatar_url || null,
          elo: null,
          isPremium: !!(user?.premium_until && new Date(user.premium_until) > new Date()),
        }}
        isTopPlayerActive={currentTurn === "black"}
        isBottomPlayerActive={currentTurn === "white"}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      {aiThinking && (
        <div className="flex items-center gap-2 text-sm text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          El entrenador está pensando...
        </div>
      )}

      {gameStatus === "finished" && finishedLabel && (
        <div className="bg-white/10 rounded-lg px-6 py-3 flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <span className="font-semibold">{finishedLabel}</span>
        </div>
      )}

      <div style={{ width: "min(480px, 90vw)", aspectRatio: "1/1" }} className="relative">
        {!roomReady && (
          <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center rounded-lg">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        )}
        <div className="grid grid-cols-8 border-2 border-white/10 rounded-lg overflow-hidden shadow-2xl w-full h-full">
          {Array.from({ length: 8 }).map((_, ri) =>
            Array.from({ length: 8 }).map((_, ci) => {
              const row = ri;
              const col = ci;
              const piece = board[row][col];
              const isLight = (row + col) % 2 === 0;
              const isSelected = selectedSquare?.row === row && selectedSquare?.col === col;
              const isValidMove = validMoves.some(m => m.row === row && m.col === col);
              const isKingInCheck = playerInCheck && piece === "wK";
              const canInteract = gameStatus === "playing" && currentTurn === "white" && !aiThinking && roomReady;
              const bg = isLight ? theme.light : theme.dark;
              const labelColor = isLight ? theme.labelLight : theme.labelDark;

              return (
                <div
                  key={`${row}-${col}`}
                  onClick={() => canInteract && handleSquareClick(row, col)}
                  className={`aspect-square flex items-center justify-center relative overflow-hidden
                    ${canInteract ? "cursor-pointer hover:brightness-110" : "cursor-default"}
                    ${isSelected ? "ring-4 ring-yellow-400 ring-inset" : isKingInCheck ? "ring-4 ring-red-500 ring-inset" : ""}`}
                  style={{ backgroundColor: bg }}
                >
                  {piece && renderPieceNode(piece, pieceSet)}
                  {isValidMove && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {piece
                        ? <div className="w-[85%] h-[85%] rounded-full border-4 border-black/25" />
                        : <div className="w-4 h-4 rounded-full bg-black/25" />}
                    </div>
                  )}
                  {ci === 0 && (
                    <span className="absolute top-1 left-1 text-xs font-bold" style={{ color: labelColor, opacity: 0.8 }}>
                      {8 - row}
                    </span>
                  )}
                  {ri === 7 && (
                    <span className="absolute bottom-1 right-1 text-xs font-bold" style={{ color: labelColor, opacity: 0.8 }}>
                      {FILES[col]}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => setLeaveOpen(true)} variant="secondary">
          <LogOut className="w-4 h-4 mr-2" />
          {gameStatus === "finished" ? "Volver" : "Salir"}
        </Button>
      </div>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir de la partida?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {gameStatus === "playing"
                ? "La partida seguirá guardada y podrás retomarla después desde partidas activas."
                : "Volverás al lobby."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90" onClick={handleLeave}>
              Salir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <div className="max-h-[430px] overflow-y-auto">
                <div className="grid [grid-template-columns:repeat(auto-fill,minmax(76px,1fr))] gap-2">
                  {PIECE_SETS.map(s => {
                    const selected = s.key === pieceSet;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setPieceSet(s.key)}
                        className={`relative flex flex-col items-center gap-1 rounded-lg border p-2 bg-white/5 hover:bg-white/10 transition
                          ${selected ? "border-green-500/60 ring-2 ring-green-500/30" : "border-white/10"}`}
                      >
                        <img src={getPieceDataUri(s.key, "wK")} alt="" className="w-8 h-8 object-contain" />
                        <span className="text-[10px] text-gray-400 text-center leading-tight">{s.label}</span>
                        {selected && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-500/25 border border-green-500/60 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
