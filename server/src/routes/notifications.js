import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/notifications — mis notificaciones (no leídas primero)
router.get('/', requireAuth, async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.notification.deleteMany({
    where: { user_email: req.user.email, is_read: true, created_at: { lt: thirtyDaysAgo } },
  });

  const notifications = await prisma.notification.findMany({
    where: { user_email: req.user.email },
    orderBy: [{ is_read: 'asc' }, { created_at: 'desc' }],
    take: 50,
  });
  res.json(notifications);
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireAuth, async (req, res) => {
  const count = await prisma.notification.count({
    where: { user_email: req.user.email, is_read: false },
  });
  res.json({ count });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, user_email: req.user.email },
    data: { is_read: true },
  });
  res.json({ ok: true });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { user_email: req.user.email, is_read: false },
    data: { is_read: true },
  });
  res.json({ ok: true });
});

// POST /api/notifications/game-invite — invitar amigo a una sala
router.post('/game-invite', requireAuth, async (req, res) => {
  const { target_email, room_code, game_id, game_title } = req.body;
  const me = req.user.email;
  if (!target_email || !room_code || !game_id) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const friendship = await prisma.friendship.findFirst({
    where: { status: 'accepted', OR: [{ sender_email: me, receiver_email: target_email }, { sender_email: target_email, receiver_email: me }] },
  });
  if (!friendship) return res.status(403).json({ error: 'Solo puedes invitar a amigos' });

  const sender = await prisma.user.findUnique({ where: { email: me }, select: { full_name: true } });

  await prisma.notification.create({
    data: {
      user_email: target_email,
      type: 'game_invite',
      from_email: me,
      from_name: sender?.full_name || me,
      data: { room_code, game_id, game_title: game_title || 'Partida' },
    },
  });
  res.json({ ok: true });
});

export default router;
