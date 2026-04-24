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
  pending_warning: true, created_at: true,
};

// POST /api/users/heartbeat — actualiza last_seen del usuario autenticado
router.post('/heartbeat', requireAuth, async (req, res) => {
  await prisma.user.update({ where: { id: req.user.id }, data: { last_seen: new Date() } });
  res.json({ ok: true });
});

// POST /api/users/offline — borra last_seen al cerrar sesión / pestaña
router.post('/offline', requireAuth, async (req, res) => {
  await prisma.user.update({ where: { id: req.user.id }, data: { last_seen: null } });
  res.json({ ok: true });
});

// GET /api/users (admin)
router.get('/', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { created_at: 'desc' },
  });
  res.json(users);
});

// POST /api/users/me/record-abandon — registra abandono y aplica penalización progresiva
router.post('/me/record-abandon', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { abandon_count: true },
    });
    const count = user?.abandon_count ?? 0;

    const PENALTIES = [
      // count 0 → aviso
      { type: 'warning', message: 'Primera vez: esta conducta puede resultar en sanciones futuras. ¡Respeta a tus rivales!' },
      // count 1 → 5 min
      { type: 'ban', minutes: 5,   message: 'Has abandonado 2 partidas. Sanción: 5 minutos sin jugar.' },
      // count 2 → 15 min
      { type: 'ban', minutes: 15,  message: 'Has abandonado 3 partidas. Sanción: 15 minutos sin jugar.' },
      // count 3 → 30 min
      { type: 'ban', minutes: 30,  message: 'Has abandonado 4 partidas. Sanción: 30 minutos sin jugar.' },
      // count 4+ → 2h
      { type: 'ban', minutes: 120, message: 'Reincidencia grave. Sanción: 2 horas sin jugar.' },
    ];

    const penalty = PENALTIES[Math.min(count, PENALTIES.length - 1)];
    const updateData = { abandon_count: { increment: 1 } };

    if (penalty.type === 'warning') {
      updateData.pending_warning = penalty.message;
    } else {
      const until = new Date(Date.now() + penalty.minutes * 60_000);
      updateData.play_banned_until = until;
      penalty.until = until.toISOString();
    }

    await prisma.user.update({ where: { id: req.user.id }, data: updateData });
    res.json(penalty);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error registrando abandono' });
  }
});

// DELETE /api/users/me/warning — clear pending_warning after user acknowledges (must be before /:id)
router.delete('/me/warning', requireAuth, async (_req, res) => {
  await prisma.user.update({
    where: { id: _req.user.id },
    data: { pending_warning: null },
  });
  res.json({ ok: true });
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
  const { role, is_banned, chat_muted_until, play_banned_until, pending_warning } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(role !== undefined && { role }),
      ...(is_banned !== undefined && { is_banned }),
      ...(chat_muted_until !== undefined && { chat_muted_until: chat_muted_until ? new Date(chat_muted_until) : null }),
      ...(play_banned_until !== undefined && { play_banned_until: play_banned_until ? new Date(play_banned_until) : null }),
      ...(pending_warning !== undefined && { pending_warning: pending_warning || null }),
    },
    select: USER_SELECT,
  });
  res.json(user);
});

export default router;
