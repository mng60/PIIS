import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/achievements/definitions
router.get('/definitions', async (req, res) => {
  const { game_id } = req.query;
  const defs = await prisma.achievementDefinition.findMany({
    where: { is_active: true, ...(game_id && { game_id }) },
    orderBy: { sort_order: 'asc' },
  });
  res.json(defs);
});

// POST /api/achievements/definitions (admin)
router.post('/definitions', requireAdmin, async (req, res) => {
  const { title, metric, threshold, ...rest } = req.body;
  if (!title || !metric || threshold === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const def = await prisma.achievementDefinition.create({ data: { title, metric, threshold, ...rest } });
  res.status(201).json(def);
});

// PATCH /api/achievements/definitions/:id (admin)
router.patch('/definitions/:id', requireAdmin, async (req, res) => {
  const def = await prisma.achievementDefinition.update({ where: { id: req.params.id }, data: req.body });
  res.json(def);
});

// DELETE /api/achievements/definitions/:id (admin)
router.delete('/definitions/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  await prisma.userAchievement.deleteMany({ where: { achievement_id: id } });
  await prisma.achievementDefinition.delete({ where: { id } });
  res.status(204).end();
});

// GET /api/achievements/user - own achievements
router.get('/user', requireAuth, async (req, res) => {
  const achievements = await prisma.userAchievement.findMany({
    where: { user_email: req.user.email },
  });
  res.json(achievements);
});

const RARITY_XP = { bronze: 25, silver: 75, gold: 200 };

// POST /api/achievements/user - upsert progress
router.post('/user', requireAuth, async (req, res) => {
  const { achievement_id, game_id, progress, unlocked, unlocked_date } = req.body;
  if (!achievement_id) return res.status(400).json({ error: 'achievement_id requerido' });

  // Comprobar si ya estaba desbloqueado antes de actualizar
  const existing = await prisma.userAchievement.findUnique({
    where: { achievement_id_user_email: { achievement_id, user_email: req.user.email } },
  });
  const wasUnlocked = existing?.unlocked ?? false;

  const ua = await prisma.userAchievement.upsert({
    where: { achievement_id_user_email: { achievement_id, user_email: req.user.email } },
    create: { achievement_id, user_email: req.user.email, game_id, progress: progress ?? 0, unlocked: unlocked ?? false, unlocked_date: unlocked_date ? new Date(unlocked_date) : null },
    update: { progress, unlocked, unlocked_date: unlocked_date ? new Date(unlocked_date) : undefined, game_id },
  });

  // Sumar XP solo cuando se desbloquea por primera vez
  let xpGained = 0;
  if (unlocked && !wasUnlocked) {
    const def = await prisma.achievementDefinition.findUnique({
      where:  { id: achievement_id },
      select: { rarity: true },
    });
    xpGained = RARITY_XP[def?.rarity ?? 'bronze'] ?? 25;
    await prisma.user.update({ where: { email: req.user.email }, data: { xp: { increment: xpGained } } });
  }

  res.json({ ...ua, xpGained });
});

export default router;
