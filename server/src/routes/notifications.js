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

export default router;
