import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/chat?game_id=xxx&session_id=xxx
router.get('/', async (req, res) => {
  const { game_id, session_id } = req.query;
  if (!game_id || !session_id) return res.status(400).json({ error: 'game_id y session_id requeridos' });
  const messages = await prisma.chatMessage.findMany({
    where: { game_id, session_id },
    orderBy: { created_at: 'asc' },
  });
  res.json(messages);
});

// POST /api/chat
router.post('/', requireAuth, async (req, res) => {
  const { game_id, session_id, message } = req.body;
  if (!game_id || !session_id || !message) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (message.length > 300) return res.status(400).json({ error: 'Mensaje demasiado largo' });

  // Enforce chat mute
  const sender = await prisma.user.findUnique({ where: { email: req.user.email }, select: { chat_muted_until: true } });
  if (sender?.chat_muted_until && new Date(sender.chat_muted_until) > new Date()) {
    return res.status(403).json({ error: 'Estás silenciado en el chat', until: sender.chat_muted_until });
  }

  const msg = await prisma.chatMessage.create({
    data: {
      game_id,
      session_id,
      message,
      user_email: req.user.email,
      user_name: req.user.full_name || req.user.email,
    },
  });
  res.status(201).json(msg);
});

// DELETE /api/chat/:id (admin)
router.delete('/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
  await prisma.chatMessage.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
