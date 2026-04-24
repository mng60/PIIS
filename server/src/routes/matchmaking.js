import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const QUEUE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutos
const ELO_RANGE = 300;

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function buildClock(timeKey) {
  const map = { '5': 5, '10': 10, '15': 15, '20': 20 };
  const minutes = map[timeKey];
  if (!minutes) return null;
  const ms = minutes * 60 * 1000;
  return { white: ms, black: ms, lastTick: null, running: false };
}

// POST /api/matchmaking/join — entrar en cola o hacer match inmediato
router.post('/join', requireAuth, async (req, res) => {
  const { game_id, game_mode = 'normal', elo_rating = 1200, time_key = '5' } = req.body;
  const me = req.user.email;
  const myName = req.user.full_name || me;

  if (!game_id) return res.status(400).json({ error: 'Falta game_id' });

  // Limpiar entradas propias y caducadas
  await prisma.matchmakingQueue.deleteMany({ where: { user_email: me } });
  await prisma.matchmakingQueue.deleteMany({
    where: { created_at: { lt: new Date(Date.now() - QUEUE_TIMEOUT_MS) } },
  });

  // Buscar oponente compatible en espera
  const opponents = await prisma.matchmakingQueue.findMany({
    where: {
      game_id,
      game_mode,
      status: 'waiting',
      user_email: { not: me },
    },
  });

  const opponent = opponents.find(op => {
    if (game_mode !== 'ranked') return true;
    return Math.abs(elo_rating - op.elo_rating) <= ELO_RANGE;
  });

  if (opponent) {
    const room_code = generateCode();

    // Crear la sala de juego (el oponente en espera es host, yo soy guest)
    const game = await prisma.game.findUnique({ where: { id: game_id }, select: { game_code: true } });
    const clock = buildClock(opponent.time_key || time_key);
    const board_state = JSON.stringify({ board: null, meta: { clock, drawOfferBy: null } });

    if (game?.game_code === 'chess-online') {
      await prisma.chessRoom.create({
        data: {
          room_code,
          board_state,
          host_email: opponent.user_email,
          host_name: opponent.user_name,
          guest_email: me,
          guest_name: myName,
          game_mode,
          host_elo: opponent.elo_rating,
          status: 'waiting', // guest (yo) actualizará a playing al unirse
        },
      });
    } else {
      await prisma.gameSession.create({
        data: {
          room_code,
          game_id,
          host_email: opponent.user_email,
          host_name: opponent.user_name,
          guest_email: me,
          guest_name: myName,
          game_mode,
        },
      });
    }

    // Marcar al oponente como matched
    await prisma.matchmakingQueue.update({
      where: { id: opponent.id },
      data: { status: 'matched', room_code, role: 'host' },
    });

    return res.json({ status: 'matched', room_code, role: 'guest', game_id });
  }

  // Sin oponente: unirse a la cola
  await prisma.matchmakingQueue.create({
    data: { user_email: me, user_name: myName, elo_rating, game_id, game_mode, time_key },
  });

  res.json({ status: 'waiting' });
});

// GET /api/matchmaking/status — consultar estado actual en cola
router.get('/status', requireAuth, async (req, res) => {
  const entry = await prisma.matchmakingQueue.findUnique({ where: { user_email: req.user.email } });

  if (!entry) return res.json({ status: 'not_in_queue' });

  if (entry.status === 'matched') {
    await prisma.matchmakingQueue.delete({ where: { user_email: req.user.email } });
    return res.json({ status: 'matched', room_code: entry.room_code, role: entry.role, game_id: entry.game_id });
  }

  const elapsed = Date.now() - new Date(entry.created_at).getTime();
  if (elapsed > QUEUE_TIMEOUT_MS) {
    await prisma.matchmakingQueue.delete({ where: { user_email: req.user.email } });
    return res.json({ status: 'timeout' });
  }

  res.json({ status: 'waiting', elapsed_ms: elapsed });
});

// DELETE /api/matchmaking/cancel — salir de la cola
router.delete('/cancel', requireAuth, async (req, res) => {
  await prisma.matchmakingQueue.deleteMany({ where: { user_email: req.user.email } });
  res.json({ ok: true });
});

export default router;
