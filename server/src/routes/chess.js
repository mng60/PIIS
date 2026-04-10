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

// GET /api/chess/:room_code
router.get('/:room_code', async (req, res) => {
  const room = await prisma.chessRoom.findUnique({ where: { room_code: req.params.room_code } });
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  res.json(room);
});

// POST /api/chess
router.post('/', requireAuth, async (req, res) => {
  const { room_code, board_state } = req.body;
  if (!room_code || !board_state) return res.status(400).json({ error: 'Faltan campos obligatorios' });
  const room = await prisma.chessRoom.create({
    data: {
      room_code,
      board_state,
      host_email: req.user.email,
      host_name: req.user.full_name || req.user.email,
      host_avatar_url: req.user.avatar_url || null,
    },
  });
  res.status(201).json(room);
});

// PATCH /api/chess/:room_code
router.patch('/:room_code', requireAuth, async (req, res) => {
  const room = await prisma.chessRoom.update({
    where: { room_code: req.params.room_code },
    data: req.body,
  });
  if (req.body.status === 'finished') cleanupChatMessages(req.params.room_code);
  res.json(room);

  // Si la partida termina con ganador, avanzar bracket del torneo (si aplica)
  if (req.body.status === 'finished' && req.body.winner && req.body.winner !== 'draw') {
    try {
      const match = await prisma.tournamentMatch.findFirst({
        where: { room_code: req.params.room_code, status: { not: 'finished' } },
      });
      if (match) await advanceTournamentMatch(match.id, req.body.winner);
    } catch (err) {
      console.error('[Tournament] chess advance error:', err);
    }
  }
});

// DELETE /api/chess/:room_code
router.delete('/:room_code', requireAuth, async (req, res) => {
  await cleanupChatMessages(req.params.room_code);
  await prisma.chessRoom.delete({ where: { room_code: req.params.room_code } });
  res.status(204).end();
});

export default router;
