import React, { useEffect, useRef, useState, useCallback } from "react";
import { createChessRoom, deleteChessRoom, requestAiMove, requestGameSummary } from "@/api/chess";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, LogOut, Trophy, Settings, Bot, Check } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initBoard, packBoardState, FILES, getPieceColor, getPieceType } from "@/components/chess/chessState";
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
  const col = sq.charCodeAt(0) - 97; // 'a' = 97
  const row = 8 - parseInt(sq[1]);
  return { row, col };
}

function coordsToSquare(row, col) {
  return `${FILES[col]}${8 - row}`;
}


export default function ChessVsAIGame({ user, difficulty = 2, onLeave, onMoveHistoryChange, onCoachMessage, onAnalysisLoadingChange }) {
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

  // movePairs: [{from: "e2", to: "e4"}] — authoritative move list sent to backend
  const movePairsRef = useRef([]);
  const roomCodeRef = useRef(null);
  const boardRef = useRef(initBoard());
  const gameOverRef = useRef(false);

  useEffect(() => { localStorage.setItem("chess_board_theme", boardTheme); }, [boardTheme]);
  useEffect(() => { localStorage.setItem("chess_piece_set", pieceSet); }, [pieceSet]);

  useEffect(() => {
    const setup = async () => {
      try {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase() + "A";
        await createChessRoom({
          room_code: code,
          board_state: packBoardState(initBoard(), {}),
          game_mode: "vsai",
          is_vs_ai: true,
          ai_difficulty: difficulty,
        });
        roomCodeRef.current = code;
      } catch {
        roomCodeRef.current = "LOCAL_" + Math.random().toString(36).substring(2, 6).toUpperCase();
      }
      setRoomReady(true);
    };
    setup();
    return () => {
      if (roomCodeRef.current && !gameOverRef.current) {
        deleteChessRoom(roomCodeRef.current).catch(() => {});
      }
    };
  }, []); // eslint-disable-line

  const handleGameOver = useCallback(async (result, finalMovePairs, finalHistory) => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;

    setGameStatus("finished");
    setCurrentTurn(null);
    setSelectedSquare(null);
    setValidMoves([]);
    setWinner(result);

    onAnalysisLoadingChange?.(true);
    onCoachMessage?.("info", "Analizando la partida...");

    try {
      const analysis = await requestGameSummary(roomCodeRef.current, finalMovePairs, result);
      if (analysis.accuracy !== null && analysis.accuracy !== undefined) {
        onCoachMessage?.(
          "analysis",
          `Precisión: ${analysis.accuracy}% · Blunders: ${analysis.blunders} · Errores: ${analysis.mistakes} · Imprecisiones: ${analysis.inaccuracies}`
        );
      }
      if (analysis.feedback) onCoachMessage?.("coach", analysis.feedback);
    } catch {
      onCoachMessage?.("info", "Análisis no disponible.");
    }
    onAnalysisLoadingChange?.(false);
  }, [onCoachMessage, onAnalysisLoadingChange]);

  const applyAiMove = useCallback((board, aiFrom, aiTo, aiSan, aiPromotion) => {
    const fromC = squareToCoords(aiFrom);
    const toC   = squareToCoords(aiTo);
    const newBoard = board.map(r => [...r]);
    let piece = newBoard[fromC.row][fromC.col];

    if (aiPromotion && getPieceType(piece) === "P") {
      piece = "b" + aiPromotion.toUpperCase();
    }

    newBoard[toC.row][toC.col] = piece;
    newBoard[fromC.row][fromC.col] = null;

    // Castling: also move the rook so the client board stays in sync
    if (piece && getPieceType(piece) === 'K' && Math.abs(toC.col - fromC.col) === 2) {
      const kingside = toC.col > fromC.col;
      const rookFromCol = kingside ? 7 : 0;
      const rookToCol   = kingside ? toC.col - 1 : toC.col + 1;
      newBoard[fromC.row][rookToCol] = getPieceColor(piece) === 'white' ? 'wR' : 'bR';
      newBoard[fromC.row][rookFromCol] = null;
    }

    return newBoard;
  }, []);

  const handleSquareClick = async (row, col) => {
    if (gameStatus !== "playing" || currentTurn !== "white" || aiThinking) return;
    if (!roomReady) { toast.error("Preparando partida, espera un momento..."); return; }

    if (selectedSquare) {
      const isValid = validMoves.some(m => m.row === row && m.col === col);

      if (isValid) {
        // Save previous state so we can fully revert on any error
        const prevBoard = boardRef.current;
        const prevMovePairs = [...movePairsRef.current];

        const newBoard = board.map(r => [...r]);
        const piece = newBoard[selectedSquare.row][selectedSquare.col];
        const captured = newBoard[row][col];
        let movedPiece = piece;
        if (getPieceType(piece) === "P" && row === 0) movedPiece = "wQ";

        newBoard[row][col] = movedPiece;
        newBoard[selectedSquare.row][selectedSquare.col] = null;

        const fromSq = coordsToSquare(selectedSquare.row, selectedSquare.col);
        const toSq   = coordsToSquare(row, col);
        const isPromotion = getPieceType(piece) === "P" && row === 0;
        const newMovePairs = [...prevMovePairs, { from: fromSq, to: toSq, ...(isPromotion && { promotion: "q" }) }];

        const sym = getPieceType(piece);
        const fromFile = FILES[selectedSquare.col];
        const toNotation = `${FILES[col]}${8 - row}`;
        const notation = sym === ""
          ? captured ? `${fromFile}x${toNotation}` : toNotation
          : captured ? `${sym}x${toNotation}` : `${sym}${toNotation}`;
        const fullNotation = isPromotion ? notation + "=Q" : notation;

        const newHistory = [...moveHistory, { move: fullNotation, player: "Blancas" }];
        boardRef.current = newBoard;
        setBoard(newBoard);
        setMoveHistory(newHistory);
        onMoveHistoryChange?.(newHistory);
        setSelectedSquare(null);
        setValidMoves([]);
        setPlayerInCheck(false);

        if (captured && getPieceType(captured) === "K") {
          movePairsRef.current = newMovePairs;
          handleGameOver("player_wins", newMovePairs, newHistory);
          return;
        }

        setCurrentTurn("black");
        setAiThinking(true);

        try {
          const result = await requestAiMove(roomCodeRef.current, newMovePairs);

          // Only commit movePairs on success
          movePairsRef.current = newMovePairs;

          if (result.isGameOver) {
            setAiThinking(false);
            const outcome = result.result ?? "draw";
            if (result.result === "player_wins") onCoachMessage?.("success", "¡Jaque mate! Has ganado.");
            else if (result.result === "draw") onCoachMessage?.("info", "Tablas.");
            handleGameOver(outcome, newMovePairs, newHistory);
            return;
          }

          const { from: aiFrom, to: aiTo, san: aiSan, promotion: aiPromo } = result.aiMove;
          const aiMovePairs = [...newMovePairs, { from: aiFrom, to: aiTo, ...(aiPromo && { promotion: aiPromo }) }];
          movePairsRef.current = aiMovePairs;

          const aiBoard = applyAiMove(newBoard, aiFrom, aiTo, aiSan, aiPromo);
          const aiHistory = [...newHistory, { move: aiSan || `${aiFrom}-${aiTo}`, player: "Negras" }];

          boardRef.current = aiBoard;
          setBoard(aiBoard);
          setMoveHistory(aiHistory);
          onMoveHistoryChange?.(aiHistory);
          setAiThinking(false);
          setCurrentTurn("white");

          // Detect if the AI just put the player in check
          let wKr = -1, wKc = -1;
          outer: for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              if (aiBoard[r][c] === 'wK') { wKr = r; wKc = c; break outer; }
            }
          }
          if (wKr !== -1 && isSquareAttacked(aiBoard, wKr, wKc, 'black')) {
            setPlayerInCheck(true);
            onCoachMessage?.("error", "¡Jaque! Mueve tu rey para salir del peligro.");
          }

        } catch (e) {
          // Revert everything — movePairsRef was never committed
          boardRef.current = prevBoard;
          setBoard(prevBoard);
          setMoveHistory(moveHistory);
          setAiThinking(false);
          setCurrentTurn("white");
          const errMsg = e?.response?.data?.error || e?.message || "";
          if (errMsg === "invalid_move") {
            toast.error("Movimiento ilegal. Tu rey quedaría en jaque.");
          } else {
            toast.error("El entrenador no pudo responder. Inténtalo de nuevo.");
          }
        }

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

  const handleLeave = () => {
    if (roomCodeRef.current) deleteChessRoom(roomCodeRef.current).catch(() => {});
    onLeave?.();
  };

  const theme = BOARD_THEMES[boardTheme] || BOARD_THEMES.classic;
  const diffColor = DIFFICULTY_COLORS[difficulty] || "#8b5cf6";

  const finishedLabel =
    winner === "player_wins" ? "¡Victoria!" :
    winner === "ai_wins"    ? "Derrota" :
    winner === "draw"       ? "Tablas" : "";

  return (
    <div className="flex flex-col items-center gap-3 p-2 sm:p-4 w-full">
      {/* Player zones */}
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

      {/* AI thinking indicator */}
      {aiThinking && (
        <div className="flex items-center gap-2 text-sm text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          El entrenador está pensando...
        </div>
      )}

      {/* Finished banner */}
      {gameStatus === "finished" && finishedLabel && (
        <div className="bg-white/10 rounded-lg px-6 py-3 flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <span className="font-semibold">{finishedLabel}</span>
        </div>
      )}

      {/* Board */}
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
              const isKingInCheck = playerInCheck && piece === 'wK';
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

      {/* Buttons */}
      <div className="flex gap-3">
        <Button onClick={() => setLeaveOpen(true)} variant="secondary">
          <LogOut className="w-4 h-4 mr-2" />
          {gameStatus === "finished" ? "Volver" : "Salir"}
        </Button>
      </div>

      {/* Leave dialog */}
      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir de la partida?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {gameStatus === "playing" ? "La partida se perderá y no se guardará." : "Volverás al lobby."}
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

      {/* Settings dialog */}
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
                    <button key={k} type="button" onClick={() => setBoardTheme(k)}
                      className={`relative rounded-lg border p-3 bg-white/5 hover:bg-white/10 transition
                        ${selected ? "border-green-500/60 ring-2 ring-green-500/30" : "border-white/10"}`}>
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
                      <button key={s.key} type="button" onClick={() => setPieceSet(s.key)}
                        className={`relative flex flex-col items-center gap-1 rounded-lg border p-2 bg-white/5 hover:bg-white/10 transition
                          ${selected ? "border-green-500/60 ring-2 ring-green-500/30" : "border-white/10"}`}>
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

      <style>{`
        @keyframes fadeOutTurn {
          0%   { opacity: 1; transform: scale(1); }
          70%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}
