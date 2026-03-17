import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const USER_SELECT = {
  id: true, email: true, full_name: true, role: true,
  avatar_url: true, is_banned: true,
  chat_muted_until: true, play_banned_until: true,
  created_at: true,
};

// GET /api/users (admin)
router.get('/', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { created_at: 'desc' },
  });
  res.json(users);
});

// PATCH /api/users/me - update own profile (must be before /:id)
router.patch('/me', requireAuth, async (req, res) => {
  const { full_name, avatar_url } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { ...(full_name && { full_name }), ...(avatar_url !== undefined && { avatar_url }) },
    select: { id: true, email: true, full_name: true, role: true, avatar_url: true },
  });
  res.json(user);
});

// PATCH /api/users/:id/reset-password (admin)
router.patch('/:id/reset-password', requireAdmin, async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres' });
  }
  const hashed = await bcrypt.hash(new_password, 10);
  await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } });
  res.json({ ok: true });
});

// PATCH /api/users/:id (admin)
router.patch('/:id', requireAdmin, async (req, res) => {
  const { role, is_banned, chat_muted_until, play_banned_until } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(role !== undefined && { role }),
      ...(is_banned !== undefined && { is_banned }),
      ...(chat_muted_until !== undefined && { chat_muted_until: chat_muted_until ? new Date(chat_muted_until) : null }),
      ...(play_banned_until !== undefined && { play_banned_until: play_banned_until ? new Date(play_banned_until) : null }),
    },
    select: USER_SELECT,
  });
  res.json(user);
});

export default router;
