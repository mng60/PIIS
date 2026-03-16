import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/reports (any authenticated user)
router.post('/', requireAuth, async (req, res) => {
  const { target_kind, target_id, game_id, reporter_email, reported_user_email, reason, target_text, ...rest } = req.body;
  if (!target_kind || !target_id || !game_id || !reported_user_email || !reason || !target_text) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const report = await prisma.report.create({
    data: {
      target_kind,
      target_id,
      game_id,
      reporter_email: req.user.email,
      reporter_name: req.user.full_name || req.user.email,
      reported_user_email,
      reason,
      target_text,
      ...rest,
    },
  });
  res.status(201).json(report);
});

// GET /api/reports (admin)
router.get('/', requireAdmin, async (req, res) => {
  const { status } = req.query;
  const reports = await prisma.report.findMany({
    where: { ...(status && { status }) },
    orderBy: { created_at: 'desc' },
  });
  res.json(reports);
});

// PATCH /api/reports/:id (admin)
router.patch('/:id', requireAdmin, async (req, res) => {
  const { status, admin_action, action_until, admin_notes } = req.body;
  const report = await prisma.report.update({
    where: { id: req.params.id },
    data: {
      ...(status && { status }),
      ...(admin_action && { admin_action }),
      ...(action_until && { action_until: new Date(action_until) }),
      ...(admin_notes !== undefined && { admin_notes }),
      handled_by: req.user.email,
      handled_date: new Date(),
    },
  });
  res.json(report);
});

export default router;
