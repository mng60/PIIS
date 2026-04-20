import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const PUBLIC_USER = { id: true, email: true, full_name: true, avatar_url: true, xp: true, created_at: true };

// GET /api/profiles/search?q= — buscar usuarios por nombre o email
router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { email: { not: req.user.email } },
        { role: { not: 'admin' } },
        {
          OR: [
            { full_name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: PUBLIC_USER,
    take: 20,
  });
  res.json(users);
});

// GET /api/profiles/:email — perfil público de un usuario
router.get('/:email', requireAuth, async (req, res) => {
  const email = req.params.email;

  const user = await prisma.user.findUnique({
    where: { email },
    select: PUBLIC_USER,
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const [stats, achievements] = await Promise.all([
    prisma.userGameStats.findMany({
      where: { user_email: email },
      select: { game_id: true, plays_count: true, best_score: true, wins_count: true, elo_rating: true, time_played: true },
    }),
    prisma.userAchievement.findMany({
      where: { user_email: email, unlocked: true },
      select: { achievement_id: true, game_id: true, unlocked_date: true },
    }),
  ]);

  res.json({ ...user, stats, achievements });
});

export default router;
