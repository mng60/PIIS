import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { Chess } from 'chess.js';
import stockfish from '../services/stockfishService.js';

const router = Router();
const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyMove(evalBefore, evalAfter, playerColor) {
  // evalBefore/After: centipawns from white's perspective
  // loss > 0 means player lost material/position on this move
  const loss = playerColor === 'white'
    ? evalBefore - evalAfter
    : evalAfter - evalBefore;

  if (loss > 200) return 'blunder';
  if (loss > 100) return 'mistake';
  if (loss > 50)  return 'inaccuracy';
  if (loss < -50) return 'excellent';
  return 'good';
}

function buildCoachText(accuracy, blunders, mistakes, inaccuracies, result) {
  const lines = [];

  if (result === 'player_wins') lines.push('¡Enhorabuena, has ganado al entrenador!');
  else if (result === 'ai_wins') lines.push('Has perdido esta vez, pero cada derrota es una lección.');
  else if (result === 'draw') lines.push('Tablas. Has aguantado bien.');

  if (blunders === 0 && mistakes <= 1) {
    lines.push('Partida muy limpia, cometiste pocos errores graves.');
  } else if (blunders >= 3) {
    lines.push('Hubo varios blunders que cambiaron el rumbo. Revisa bien antes de mover en posiciones tensas.');
  } else if (blunders === 1 || blunders === 2) {
    lines.push('Un blunder/dos cambió la partida. Practica calcular variantes antes de ejecutar.');
  } else if (mistakes >= 3) {
    lines.push('Varios errores medianos acumularon desventaja. Intenta valorar mejor cada jugada.');
  }

  if (accuracy >= 90) lines.push(`Precisión excelente (${accuracy}%). Sigue así.`);
  else if (accuracy >= 75) lines.push(`Precisión correcta (${accuracy}%). Hay margen de mejora.`);
  else lines.push(`Precisión baja (${accuracy}%). Practica más análisis para reducir errores.`);

  return lines.join(' ');
}

function replayMoves(moves) {
  const chess = new Chess();
  for (const { from, to, promotion } of moves) {
    const result = chess.move({ from, to, promotion: promotion || 'q' });
    if (!result) throw new Error(`Movimiento inválido: ${from}${to}`);
  }
  return chess;
}

// ─── POST /api/coach/ai-move ─────────────────────────────────────────────────
// Body: { room_code, moves: [{from, to}], player_color }
// Returns: { aiMove: {from, to, san, promotion?}, isGameOver, result? }
router.post('/ai-move', requireAuth, async (req, res) => {
  const { room_code, moves = [], player_color = 'white' } = req.body;

  if (!room_code) return res.status(400).json({ error: 'room_code requerido' });
  if (!stockfish.isAvailable) {
    return res.status(503).json({ error: 'Motor de ajedrez no disponible' });
  }

  // Verify room is a vs AI room
  const room = await prisma.chessRoom.findUnique({ where: { room_code } });
  if (!room || !room.is_vs_ai) {
    return res.status(404).json({ error: 'Sala vs IA no encontrada' });
  }

  let chess;
  try {
    chess = replayMoves(moves);
  } catch (e) {
    return res.status(400).json({ error: 'invalid_move', message: e.message });
  }

  // Check if game is already over after player's last move
  if (chess.isGameOver()) {
    let result = 'draw';
    if (chess.isCheckmate()) {
      result = chess.turn() === 'b' ? 'player_wins' : 'ai_wins';
    }
    return res.json({ isGameOver: true, result, aiMove: null });
  }

  // Get AI move from Stockfish
  const fen = chess.fen();
  let uciMove;
  try {
    uciMove = await stockfish.getBestMove(fen, room.ai_difficulty);
  } catch (e) {
    return res.status(500).json({ error: 'Error del motor de ajedrez' });
  }

  if (!uciMove) return res.status(500).json({ error: 'Sin movimiento disponible' });

  const aiFrom = uciMove.slice(0, 2);
  const aiTo = uciMove.slice(2, 4);
  const aiPromotion = uciMove.length === 5 ? uciMove[4] : undefined;

  let aiMoveResult;
  try {
    aiMoveResult = chess.move({ from: aiFrom, to: aiTo, promotion: aiPromotion || 'q' });
  } catch (e) {
    return res.status(500).json({ error: 'Movimiento de IA inválido' });
  }

  const isGameOver = chess.isGameOver();
  let result = null;
  if (isGameOver) {
    if (chess.isCheckmate()) result = 'ai_wins';
    else result = 'draw';
  }

  return res.json({
    isGameOver,
    result,
    aiMove: {
      from: aiFrom,
      to: aiTo,
      san: aiMoveResult.san,
      promotion: aiPromotion || null,
    },
  });
});

// ─── POST /api/coach/game-summary ────────────────────────────────────────────
// Body: { room_code, moves: [{from, to}], result }
// Returns: { accuracy, blunders, mistakes, inaccuracies, feedback }
router.post('/game-summary', requireAuth, async (req, res) => {
  const { room_code, moves = [], result = 'unknown' } = req.body;

  if (!stockfish.isAvailable) {
    return res.json({ accuracy: null, blunders: 0, mistakes: 0, inaccuracies: 0, feedback: 'Análisis no disponible.' });
  }

  const room = await prisma.chessRoom.findUnique({ where: { room_code } }).catch(() => null);
  const playerColor = 'white'; // player is always white in vs AI mode

  const chess = new Chess();
  let blunders = 0;
  let mistakes = 0;
  let inaccuracies = 0;
  let totalLoss = 0;
  let playerMoveCount = 0;

  // Analyze up to 30 player moves (shallow depth for speed)
  const maxAnalyze = Math.min(moves.length, 60);

  for (let i = 0; i < maxAnalyze; i++) {
    const { from, to, promotion } = moves[i];
    const isPlayerMove = (i % 2 === 0 && playerColor === 'white') || (i % 2 === 1 && playerColor === 'black');

    let evalBefore = null;
    if (isPlayerMove) {
      try {
        evalBefore = await stockfish.evaluatePosition(chess.fen());
      } catch { evalBefore = 0; }
    }

    try {
      chess.move({ from, to, promotion: promotion || 'q' });
    } catch {
      break;
    }

    if (isPlayerMove && evalBefore !== null) {
      let evalAfter = 0;
      try {
        evalAfter = await stockfish.evaluatePosition(chess.fen());
      } catch { evalAfter = 0; }

      const classification = classifyMove(evalBefore, evalAfter, playerColor);
      const loss = playerColor === 'white' ? evalBefore - evalAfter : evalAfter - evalBefore;
      totalLoss += Math.max(0, loss);
      playerMoveCount++;

      if (classification === 'blunder') blunders++;
      else if (classification === 'mistake') mistakes++;
      else if (classification === 'inaccuracy') inaccuracies++;
    }
  }

  const avgLoss = playerMoveCount > 0 ? totalLoss / playerMoveCount : 0;
  const accuracy = Math.max(0, Math.min(100, Math.round(100 - avgLoss * 0.4)));

  const feedback = buildCoachText(accuracy, blunders, mistakes, inaccuracies, result);

  // Mark room as finished if not already
  if (room) {
    const winnerField = result === 'player_wins' ? room.host_email
      : result === 'ai_wins' ? 'ai'
      : 'draw';
    await prisma.chessRoom.update({
      where: { room_code },
      data: { status: 'finished', winner: winnerField },
    }).catch(() => {});
  }

  return res.json({ accuracy, blunders, mistakes, inaccuracies, feedback });
});

export default router;
