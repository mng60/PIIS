import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/profiles/search?q=
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
    select: { id: true, email: true, full_name: true, avatar_url: true, xp: true, role: true },
    take: 20,
  });
  res.json(users);
});

// GET /api/profiles/:email — perfil público
router.get('/:email', requireAuth, async (req, res) => {
  const email = req.params.email;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, full_name: true, avatar_url: true, xp: true, role: true, created_at: true, premium_until: true },
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (user.role === 'admin') return res.status(404).json({ error: 'Perfil no disponible' });

  // Perfil empresa: solo sus juegos
  if (user.role === 'empresa') {
    const games = await prisma.game.findMany({
      where: { created_by: email, is_active: true },
      select: { id: true, title: true, thumbnail: true, description: true, category: true, plays_count: true },
      orderBy: { title: 'asc' },
    });
    return res.json({ id: user.id, full_name: user.full_name, avatar_url: user.avatar_url, role: 'empresa', games });
  }

  // Perfil normal
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

  // Añadir info del juego a cada stat
  const gameIds = stats.map(s => s.game_id);
  const games = gameIds.length > 0
    ? await prisma.game.findMany({
        where: { id: { in: gameIds } },
        select: { id: true, title: true, thumbnail: true, category: true, is_multiplayer: true },
      })
    : [];
  const gameMap = Object.fromEntries(games.map(g => [g.id, g]));
  const statsWithGames = stats.map(s => ({ ...s, game: gameMap[s.game_id] || null }));

  // Amigos en común
  const myEmail = req.user.email;
  const [myFriendships, theirFriendships] = await Promise.all([
    prisma.friendship.findMany({
      where: { status: 'accepted', OR: [{ sender_email: myEmail }, { receiver_email: myEmail }] },
    }),
    prisma.friendship.findMany({
      where: { status: 'accepted', OR: [{ sender_email: email }, { receiver_email: email }] },
    }),
  ]);
  const myFriendEmails = new Set(myFriendships.map(f => f.sender_email === myEmail ? f.receiver_email : f.sender_email));
  const theirFriendEmails = theirFriendships.map(f => f.sender_email === email ? f.receiver_email : f.sender_email);
  const commonEmails = theirFriendEmails.filter(e => myFriendEmails.has(e));
  const commonFriends = commonEmails.length > 0
    ? await prisma.user.findMany({
        where: { email: { in: commonEmails } },
        select: { email: true, full_name: true, avatar_url: true },
      })
    : [];

  const is_premium = !!(user.premium_until && new Date(user.premium_until) > new Date());

  res.json({
    id: user.id,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    xp: user.xp,
    role: user.role,
    is_premium,
    stats: statsWithGames,
    achievements,
    common_friends: commonFriends,
  });
});

export default router;
