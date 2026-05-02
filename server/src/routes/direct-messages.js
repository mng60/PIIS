import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const twoWeeksAgo = () => new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

// GET /api/dm/unread — { email: count } para todos los remitentes con no leídos
router.get('/unread', requireAuth, async (req, res) => {
  const me = req.user.email;
  const messages = await prisma.directMessage.findMany({
    where: { receiver_email: me, is_read: false, created_at: { gte: twoWeeksAgo() } },
    select: { sender_email: true },
  });
  const counts = {};
  for (const m of messages) {
    counts[m.sender_email] = (counts[m.sender_email] || 0) + 1;
  }
  res.json(counts);
});

// GET /api/dm/:email — historial de conversación (últimas 2 semanas)
router.get('/:email', requireAuth, async (req, res) => {
  const me = req.user.email;
  const other = req.params.email;
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { sender_email: me, receiver_email: other },
        { sender_email: other, receiver_email: me },
      ],
      created_at: { gte: twoWeeksAgo() },
    },
    orderBy: { created_at: 'asc' },
  });
  res.json(messages);
});

// POST /api/dm/:email — enviar mensaje
router.post('/:email', requireAuth, async (req, res) => {
  const me = req.user.email;
  const other = req.params.email;
  const { message } = req.body;

  if (!message || !message.trim()) return res.status(400).json({ error: 'Mensaje vacío' });
  if (message.length > 1000) return res.status(400).json({ error: 'Mensaje demasiado largo' });

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: 'accepted',
      OR: [{ sender_email: me, receiver_email: other }, { sender_email: other, receiver_email: me }],
    },
  });
  if (!friendship) return res.status(403).json({ error: 'Solo puedes chatear con amigos' });

  const msg = await prisma.directMessage.create({
    data: { sender_email: me, receiver_email: other, message: message.trim() },
  });
  res.json(msg);
});

// PATCH /api/dm/read/:email — marcar mensajes de :email como leídos
router.patch('/read/:email', requireAuth, async (req, res) => {
  await prisma.directMessage.updateMany({
    where: { sender_email: req.params.email, receiver_email: req.user.email, is_read: false },
    data: { is_read: true },
  });
  res.json({ ok: true });
});

export default router;
