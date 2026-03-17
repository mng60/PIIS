import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/scores?game_id=xxx&limit=10
// Devuelve la MEJOR puntuación de cada usuario (sin duplicados en el ranking)
router.get('/', async (req, res) => {
  const { game_id, user_email, limit = '20' } = req.query;
  const scores = await prisma.score.findMany({
    where: {
      ...(game_id && { game_id }),
      ...(user_email && { user_email }),
    },
    orderBy: { score: 'desc' },
    // distinct + orderBy desc → primera aparición de cada usuario = su mejor score
    ...(game_id && { distinct: ['user_email'] }),
    take: parseInt(limit),
  });
  res.json(scores);
});

// POST /api/scores
router.post('/', requireAuth, async (req, res) => {
  const { game_id, score } = req.body;
  if (!game_id || score === undefined) return res.status(400).json({ error: 'Faltan campos obligatorios' });
  const entry = await prisma.score.create({
    data: {
      game_id,
      score: parseFloat(score),
      user_email: req.user.email,
      user_name: req.user.full_name || req.user.email,
    },
  });
  res.status(201).json(entry);
});

export default router;
