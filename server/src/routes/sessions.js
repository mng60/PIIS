import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

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
  const { room_code, game_id, game_state, current_turn, max_players } = req.body;
  if (!room_code || !game_id) return res.status(400).json({ error: 'Faltan campos obligatorios' });

  const session = await prisma.gameSession.create({
    data: {
      room_code,
      game_id,
      host_email: req.user.email,
      host_name: req.user.full_name || req.user.email,
      max_players: max_players ?? 2,
      players: [{ email: req.user.email, name: req.user.full_name || req.user.email, role: 'player_0' }],
      game_state: game_state ?? {},
      current_turn: current_turn ?? 'host',
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
});

// DELETE /api/sessions/:room_code — delete a room
router.delete('/:room_code', requireAuth, async (req, res) => {
  await cleanupChatMessages(req.params.room_code);
  await prisma.gameSession.delete({ where: { room_code: req.params.room_code } });
  res.status(204).end();
});

export default router;
