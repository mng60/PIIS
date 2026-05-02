import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

function isPremiumActive(user) {
  return !!(user.premium_until && new Date(user.premium_until) > new Date());
}

// GET /api/premium/status
router.get('/status', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { premium_until: true, subscription_cancel_at: true },
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const is_premium = isPremiumActive(user);
  const will_cancel = !!(user.subscription_cancel_at);

  res.json({
    is_premium,
    premium_until: user.premium_until,
    will_cancel,
    cancel_at: user.subscription_cancel_at,
  });
});

// POST /api/premium/subscribe — activa premium por 1 mes (ficticio)
router.post('/subscribe', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { premium_until: true, subscription_cancel_at: true },
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Si ya tiene premium activo y no va a cancelar, no hacer nada
  if (isPremiumActive(user) && !user.subscription_cancel_at) {
    return res.status(409).json({ error: 'Ya tienes una suscripción activa' });
  }

  // Si tenía premium activo con cancelación pendiente, reactivar
  // Si no tenía premium, empezar desde ahora
  const base = (isPremiumActive(user) && user.premium_until)
    ? new Date(user.premium_until)
    : new Date();

  const premium_until = new Date(base);
  premium_until.setMonth(premium_until.getMonth() + 1);

  await prisma.user.update({
    where: { id: req.user.id },
    data: { premium_until, subscription_cancel_at: null },
  });

  res.json({ ok: true, premium_until });
});

// POST /api/premium/cancel — cancela al final del período (estilo Spotify)
router.post('/cancel', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { premium_until: true, subscription_cancel_at: true },
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (!isPremiumActive(user)) {
    return res.status(400).json({ error: 'No tienes premium activo' });
  }
  if (user.subscription_cancel_at) {
    return res.status(409).json({ error: 'La cancelación ya está programada' });
  }

  // La cancelación surte efecto el día del mes siguiente (premium_until actual)
  await prisma.user.update({
    where: { id: req.user.id },
    data: { subscription_cancel_at: user.premium_until },
  });

  res.json({ ok: true, cancel_at: user.premium_until });
});

export default router;
