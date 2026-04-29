import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { isDatabaseConnectionError } from '../mockData.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/scores
//   ?game_id=xxx                  → leaderboard del juego (best_score por usuario)
//   ?user_email=xxx               → resumen de juegos del usuario (perfil)
//   ?user_email=xxx&game_id=xxx   → stats de un usuario en un juego (logros)
router.get('/', async (req, res) => {
  const { game_id, user_email, limit = '20' } = req.query;

  try {
    if (user_email && game_id) {
    // Logros: stats de un usuario en un juego concreto
    const stat = await prisma.userGameStats.findUnique({
      where: { user_email_game_id: { user_email, game_id } },
    });
    return res.json(stat ? [stat] : []);
  }

    if (user_email) {
    // Perfil: todos los juegos del usuario ordenados por última partida
    const stats = await prisma.userGameStats.findMany({
      where: { user_email },
      orderBy: { last_played: 'desc' },
      take: parseInt(limit),
    });
    const gameIds = stats.map(s => s.game_id);
    const games = await prisma.game.findMany({
      where: { id: { in: gameIds } },
      select: { id: true, title: true },
    });
    const gameMap = Object.fromEntries(games.map(g => [g.id, g.title]));
    return res.json(stats.map(s => ({ ...s, game_title: gameMap[s.game_id] ?? 'Juego desconocido' })));
  }

    if (game_id) {
    // Leaderboard: top jugadores de un juego por best_score
    const stats = await prisma.userGameStats.findMany({
      where: { game_id },
      orderBy: { best_score: 'desc' },
      take: parseInt(limit),
    });
      return res.json(stats);
    }
  } catch (error) {
    if (!isDatabaseConnectionError(error)) throw error;
    return res.json([]);
  }

  res.status(400).json({ error: 'Se requiere game_id o user_email' });
});

// POST /api/scores — registra una partida y actualiza UserGameStats
// Si minimal=true solo actualiza plays_count y time_played (juegos sin leaderboard ni logros)
router.post('/', requireAuth, async (req, res) => {
  const { game_id, score, time_played = 0, minimal = false } = req.body;
  if (!game_id) return res.status(400).json({ error: 'Falta game_id' });

  const timeSecs = parseInt(time_played) || 0;
  const base     = { user_email: req.user.email, game_id };

  // Obtener datos del juego y nombre del usuario en paralelo
  let game;
  let dbUser;
  try {
    [game, dbUser] = await Promise.all([
      prisma.game.findUnique({ where: { id: game_id }, select: { xp_per_play: true, is_multiplayer: true } }),
      prisma.user.findUnique({ where: { id: req.user.id }, select: { full_name: true } }),
    ]);
  } catch (error) {
    if (!isDatabaseConnectionError(error)) throw error;
    const scoreVal = parseFloat(score ?? 0);
    return res.status(201).json({
      id: `mock-score-${Date.now()}`,
      user_email: req.user.email,
      user_name: req.user.email.split('@')[0],
      game_id,
      plays_count: 1,
      best_score: scoreVal,
      last_score: scoreVal,
      xpGained: 10,
    });
  }
  const displayName = dbUser?.full_name || req.user.email.split('@')[0];

  if (minimal) {
    const stats = await prisma.userGameStats.upsert({
      where:  { user_email_game_id: base },
      create: { ...base, user_name: displayName, plays_count: 1, time_played: timeSecs, last_played: new Date() },
      update: { plays_count: { increment: 1 }, time_played: { increment: timeSecs }, last_played: new Date() },
    });
    const xpGained = game?.is_multiplayer ? 35 : (game?.xp_per_play ?? 10);
    await prisma.user.update({ where: { email: req.user.email }, data: { xp: { increment: xpGained } } });
    return res.status(201).json({ ...stats, xpGained });
  }

  if (score === undefined) return res.status(400).json({ error: 'Falta score' });

  const scoreVal = parseFloat(score);

  const existing = await prisma.userGameStats.findUnique({ where: { user_email_game_id: base } });

  const update = {
    user_name:   displayName,
    plays_count: { increment: 1 },
    best_score:  !existing || scoreVal > existing.best_score ? scoreVal : existing.best_score,
    last_score:  scoreVal,
    total_score: { increment: scoreVal },
    time_played: { increment: timeSecs },
    last_played: new Date(),
  };
  if (scoreVal > 0 && game?.is_multiplayer) update.wins_count = { increment: 1 };

  const stats = await prisma.userGameStats.upsert({
    where:  { user_email_game_id: base },
    create: {
      ...base,
      user_name:   displayName,
      plays_count: 1,
      best_score:  scoreVal,
      last_score:  scoreVal,
      wins_count:  (scoreVal > 0 && game?.is_multiplayer) ? 1 : 0,
      total_score: scoreVal,
      time_played: timeSecs,
      last_played: new Date(),
    },
    update,
  });

  // Calcular y sumar XP al usuario
  const xpFromPlay  = game?.is_multiplayer ? 35 : (game?.xp_per_play ?? 10);
  const xpFromScore = game?.is_multiplayer ? 0 : Math.floor(scoreVal / 100);
  const xpGained    = xpFromPlay + xpFromScore;
  await prisma.user.update({ where: { email: req.user.email }, data: { xp: { increment: xpGained } } });

  res.status(201).json({ ...stats, xpGained });
});

export default router;
