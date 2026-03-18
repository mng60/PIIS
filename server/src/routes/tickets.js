import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/tickets/password-reset (public — user is not logged in)
router.post('/password-reset', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier || !identifier.trim()) {
    return res.status(400).json({ error: 'Identificador requerido' });
  }

  const email = identifier.trim().includes('@')
    ? identifier.trim()
    : `${identifier.trim()}@playcraft.com`;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const existing = await prisma.passwordResetTicket.findFirst({
        where: { user_email: email, status: 'open' },
      });
      if (!existing) {
        await prisma.passwordResetTicket.create({
          data: { user_email: email, user_name: user.full_name },
        });
      }
    }
  } catch (_) {
    // Silently ignore errors to avoid exposing user info
  }

  // Always respond success (avoid user enumeration)
  res.json({ ok: true });
});

// GET /api/tickets (admin)
router.get('/', requireAdmin, async (req, res) => {
  const { status } = req.query;
  const tickets = await prisma.passwordResetTicket.findMany({
    where: status ? { status } : undefined,
    orderBy: { created_at: 'desc' },
  });
  res.json(tickets);
});

// PATCH /api/tickets/:id/resolve (admin)
router.patch('/:id/resolve', requireAdmin, async (req, res) => {
  const ticket = await prisma.passwordResetTicket.update({
    where: { id: req.params.id },
    data: {
      status: 'resolved',
      resolved_by: req.user.email,
      resolved_at: new Date(),
    },
  });
  res.json(ticket);
});

export default router;
