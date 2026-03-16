import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

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
  res.json(room);
});

// DELETE /api/chess/:room_code
router.delete('/:room_code', requireAuth, async (req, res) => {
  await prisma.chessRoom.delete({ where: { room_code: req.params.room_code } });
  res.status(204).end();
});

export default router;
