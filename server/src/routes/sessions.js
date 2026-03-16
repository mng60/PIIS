import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/sessions/:room_code
router.get('/:room_code', async (req, res) => {
  const session = await prisma.gameSession.findUnique({ where: { room_code: req.params.room_code } });
  if (!session) return res.status(404).json({ error: 'Sala no encontrada' });
  res.json(session);
});

// POST /api/sessions  — create a room (host = authenticated user)
router.post('/', requireAuth, async (req, res) => {
  const { room_code, game_id, game_state, current_turn } = req.body;
  if (!room_code || !game_id) return res.status(400).json({ error: 'Faltan campos obligatorios' });

  const session = await prisma.gameSession.create({
    data: {
      room_code,
      game_id,
      host_email: req.user.email,
      host_name: req.user.full_name || req.user.email,
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
  await prisma.gameSession.delete({ where: { room_code: req.params.room_code } });
  res.status(204).end();
});

export default router;
