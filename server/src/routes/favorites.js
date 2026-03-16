import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/favorites (own)
router.get('/', requireAuth, async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { user_email: req.user.email },
    orderBy: { created_at: 'desc' },
  });
  res.json(favorites);
});

// POST /api/favorites
router.post('/', requireAuth, async (req, res) => {
  const { game_id } = req.body;
  if (!game_id) return res.status(400).json({ error: 'game_id requerido' });
  const fav = await prisma.favorite.upsert({
    where: { game_id_user_email: { game_id, user_email: req.user.email } },
    create: { game_id, user_email: req.user.email },
    update: {},
  });
  res.status(201).json(fav);
});

// DELETE /api/favorites/:game_id
router.delete('/:game_id', requireAuth, async (req, res) => {
  await prisma.favorite.deleteMany({
    where: { game_id: req.params.game_id, user_email: req.user.email },
  });
  res.status(204).end();
});

export default router;
