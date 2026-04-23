import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { advanceTournamentMatch } from '../lib/tournamentAdvance.js';

const router = Router();
const prisma = new PrismaClient();

async function cleanupChatMessages(room_code) {
  try {
    const messages = await prisma.chatMessage.findMany({ where: { session_id: room_code }, select: { id: true } });
    if (!messages.length) return;
    const ids = messages.map(m => m.id);
    const reported = await prisma.report.findMany({ where: { target_id: { in: ids }, target_kind: 'chat_message' }, select: { target_id: true } });
    const reportedIds = new Set(reported.map(r => r.target_id));
    const toDelete = ids.filter(id => !reportedIds.has(id));
    if (toDelete.length) await prisma.chatMessage.deleteMany({ where: { id: { in: toDelete } } });
  } catch { /* silencioso */ }
}

// GET /api/sessions/:room_code
router.get('/:room_code', async (req, res) => {
  const session = await prisma.gameSession.findUnique({ where: { room_code: req.params.room_code } });
  if (!session) return res.status(404).json({ error: 'Sala no encontrada' });
  res.json(session);
});

// POST /api/sessions  — create a room (host = authenticated user)
router.post('/', requireAuth, async (req, res) => {
  const { room_code, game_id, game_state, current_turn, game_mode, min_players, max_players } = req.body;
  if (!room_code || !game_id) return res.status(400).json({ error: 'Faltan campos obligatorios' });

  const session = await prisma.gameSession.create({
    data: {
      room_code,
      game_id,
      host_email: req.user.email,
      host_name: req.user.full_name || req.user.email,
      game_state: game_state ?? {},
      current_turn: current_turn ?? 'host',
      game_mode: game_mode || 'normal',
      min_players: min_players ?? 2,
      max_players: max_players ?? 2,
    },
  });
  res.status(201).json(session);
});

// PATCH /api/sessions/:room_code — update room state
router.patch('/:room_code', requireAuth, async (req, res) => {
  const session = await prisma.gameSession.update({
    where: { room_code: req.params.room_code },
    data: req.body,
  });
  res.json(session);

  // Si la sesión termina con ganador, avanzar bracket del torneo (si existe)
  if (req.body.status === 'finished' && req.body.winner) {
    try {
      const match = await prisma.tournamentMatch.findFirst({
        where: { room_code: req.params.room_code, status: { not: 'finished' } },
      });
      if (match) await advanceTournamentMatch(match.id, req.body.winner);
    } catch (err) {
      console.error('[Tournament] advance error:', err);
    }
  }
});

// DELETE /api/sessions/:room_code — delete a room
router.delete('/:room_code', requireAuth, async (req, res) => {
  await cleanupChatMessages(req.params.room_code);
  await prisma.gameSession.delete({ where: { room_code: req.params.room_code } });
  res.status(204).end();
});

// POST /api/sessions/:room_code/join — join a room as a new player (N-player aware)
// Handles capacity, seat assignment, and status transition. Backward-compatible:
// seat 1 also writes guest_email for existing 2-player games.
const SEAT_COLORS = ["#22d3ee", "#a855f7", "#f59e0b", "#22c55e", "#ef4444", "#3b82f6"];

router.post('/:room_code/join', requireAuth, async (req, res) => {
  const { room_code } = req.params;

  const session = await prisma.gameSession.findUnique({ where: { room_code } });
  if (!session) return res.status(404).json({ error: 'Sala no encontrada' });
  if (session.status === 'finished') return res.status(409).json({ error: 'La partida ha terminado' });

  // Re-join: if already a player, just reactivate
  const existing = await prisma.gameSessionPlayer.findUnique({
    where: { room_code_user_email: { room_code, user_email: req.user.email } },
  });
  if (existing) {
    if (existing.status !== 'active') {
      await prisma.gameSessionPlayer.update({ where: { id: existing.id }, data: { status: 'active' } });
    }
    return res.json(session);
  }

  // Check capacity
  const playerCount = await prisma.gameSessionPlayer.count({ where: { room_code, status: 'active' } });
  if (playerCount >= session.max_players) return res.status(409).json({ error: 'Sala llena' });
  if (playerCount === 0) return res.status(409).json({ error: 'Sala no disponible' });

  const seat = playerCount;
  await prisma.gameSessionPlayer.create({
    data: {
      room_code,
      user_email: req.user.email,
      user_name: req.user.full_name || req.user.email,
      seat,
      role: 'player',
      color: SEAT_COLORS[seat] ?? SEAT_COLORS[SEAT_COLORS.length - 1],
    },
  });

  const updates = {};
  if (seat === 1) {
    // Backward compat for 2-player games
    updates.guest_email = req.user.email;
    updates.guest_name = req.user.full_name || req.user.email;
  }
  if (playerCount + 1 >= session.min_players && session.status === 'waiting') {
    updates.status = 'playing';
  }

  const updated = Object.keys(updates).length > 0
    ? await prisma.gameSession.update({ where: { room_code }, data: updates })
    : session;

  res.json(updated);
});

// GET /api/sessions/:room_code/players — list all players in a session
router.get('/:room_code/players', async (req, res) => {
  const players = await prisma.gameSessionPlayer.findMany({
    where: { room_code: req.params.room_code },
    orderBy: { seat: 'asc' },
  });
  res.json(players);
});

// POST /api/sessions/:room_code/players — register authenticated user as a player
// Body: { seat: number, role?: "host"|"player", color?: string }
router.post('/:room_code/players', requireAuth, async (req, res) => {
  const { seat, role, color } = req.body;
  if (seat === undefined || seat === null) return res.status(400).json({ error: 'Falta el campo seat' });
  const player = await prisma.gameSessionPlayer.upsert({
    where: { room_code_user_email: { room_code: req.params.room_code, user_email: req.user.email } },
    update: { status: 'active' },
    create: {
      room_code: req.params.room_code,
      user_email: req.user.email,
      user_name: req.user.full_name || req.user.email,
      seat,
      role: role ?? 'player',
      color: color ?? null,
    },
  });
  res.status(201).json(player);
});

// PATCH /api/sessions/:room_code/players/me — update own player status (e.g. "left")
router.patch('/:room_code/players/me', requireAuth, async (req, res) => {
  const { status } = req.body;
  const player = await prisma.gameSessionPlayer.updateMany({
    where: { room_code: req.params.room_code, user_email: req.user.email },
    data: { status: status ?? 'left' },
  });
  res.json(player);
});

export default router;
