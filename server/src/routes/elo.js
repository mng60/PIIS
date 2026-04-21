import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// ─── Fórmulas ────────────────────────────────────────────────────────────────

function calcEloDuel(ownRating, oppRating, score, kFactor) {
  const expected = 1 / (1 + Math.pow(10, (oppRating - ownRating) / 400));
  return Math.round(ownRating + kFactor * (score - expected));
}

function calcEloPosition(currentRating, position, positionPoints) {
  const delta = positionPoints[position] ?? 0;
  return Math.max(0, currentRating + delta);
}

// ─── Lógica compartida ───────────────────────────────────────────────────────

async function getOrCreateStats(email, name, gameId) {
  return prisma.userGameStats.upsert({
    where: { user_email_game_id: { user_email: email, game_id: gameId } },
    update: {},
    create: { user_email: email, user_name: name, game_id: gameId },
  });
}

/**
 * Aplica ELO a una lista de resultados.
 * Devuelve array de { email, before, after, delta }.
 */
async function applyElo({ game_id, mode, results }) {
  const game = await prisma.game.findUnique({ where: { id: game_id } });
  if (!game?.elo_enabled) return { elo_enabled: false };

  const kFactor = game.elo_k_factor ?? 32;
  const updates = [];

  if (mode === 'duel') {
    const [a, b] = results;
    const [statsA, statsB] = await Promise.all([
      getOrCreateStats(a.email, a.name, game_id),
      getOrCreateStats(b.email, b.name, game_id),
    ]);
    const newA = calcEloDuel(statsA.elo_rating, statsB.elo_rating, a.outcome, kFactor);
    const newB = calcEloDuel(statsB.elo_rating, statsA.elo_rating, b.outcome, kFactor);
    await Promise.all([
      prisma.userGameStats.update({
        where: { user_email_game_id: { user_email: a.email, game_id } },
        data: { elo_rating: newA, elo_games: { increment: 1 } },
      }),
      prisma.userGameStats.update({
        where: { user_email_game_id: { user_email: b.email, game_id } },
        data: { elo_rating: newB, elo_games: { increment: 1 } },
      }),
    ]);
    updates.push(
      { email: a.email, before: statsA.elo_rating, after: newA, delta: newA - statsA.elo_rating },
      { email: b.email, before: statsB.elo_rating, after: newB, delta: newB - statsB.elo_rating },
    );

  } else if (mode === 'position') {
    const positionPoints = (() => {
      try { return JSON.parse(game.elo_position_points || 'null'); } catch { return null; }
    })();
    if (!positionPoints) return { error: 'Puntos por posición no configurados' };

    const statsAll = await Promise.all(results.map(r => getOrCreateStats(r.email, r.name, game_id)));
    await Promise.all(results.map((r, i) => {
      const before = statsAll[i].elo_rating;
      const after = calcEloPosition(before, r.position, positionPoints);
      updates.push({ email: r.email, before, after, delta: after - before });
      return prisma.userGameStats.update({
        where: { user_email_game_id: { user_email: r.email, game_id } },
        data: { elo_rating: after, elo_games: { increment: 1 } },
      });
    }));
  }

  return { updates };
}

// ─── POST /api/elo/apply — endpoint genérico ─────────────────────────────────
/**
 * Modo "duel" (2 jugadores, ELO estándar FIDE):
 * { game_id, mode: "duel", results: [{ email, name, outcome: 1|0.5|0 }] }
 *
 * Modo "position" (3+ jugadores, puntos fijos por posición):
 * { game_id, mode: "position", results: [{ email, name, position: 0 }] }  ← 0-based
 */
router.post('/apply', requireAuth, async (req, res) => {
  const { game_id, mode, results } = req.body;
  if (!game_id || !mode || !Array.isArray(results) || results.length < 2)
    return res.status(400).json({ error: 'Faltan campos: game_id, mode, results (mínimo 2)' });
  if (!['duel', 'position'].includes(mode))
    return res.status(400).json({ error: 'mode debe ser "duel" o "position"' });
  if (mode === 'duel' && results.length !== 2)
    return res.status(400).json({ error: 'Duel requiere exactamente 2 jugadores' });

  const result = await applyElo({ game_id, mode, results });
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// ─── POST /api/elo/chess/:room_code — atajo para ajedrez ─────────────────────
router.post('/chess/:room_code', requireAuth, async (req, res) => {
  const room = await prisma.chessRoom.findUnique({ where: { room_code: req.params.room_code } });
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  if (room.status !== 'finished') return res.status(400).json({ error: 'La partida no ha terminado' });
  if (room.elo_processed) return res.json({ already_processed: true });
  if (room.game_mode !== 'ranked') return res.json({ skipped: true, reason: 'normal_mode' });

  const game = await prisma.game.findFirst({ where: { game_code: 'chess-online' } });
  if (!game?.elo_enabled) return res.json({ elo_enabled: false });

  const { host_email, guest_email, host_name, guest_name, winner } = room;
  if (!host_email || !guest_email) return res.status(400).json({ error: 'Faltan jugadores' });

  let hostOutcome, guestOutcome;
  if (winner === 'draw')          { hostOutcome = 0.5; guestOutcome = 0.5; }
  else if (winner === host_email) { hostOutcome = 1;   guestOutcome = 0;   }
  else                            { hostOutcome = 0;   guestOutcome = 1;   }

  const result = await applyElo({
    game_id: game.id,
    mode: 'duel',
    results: [
      { email: host_email,  name: host_name,            outcome: hostOutcome  },
      { email: guest_email, name: guest_name ?? 'Rival', outcome: guestOutcome },
    ],
  });

  await prisma.chessRoom.update({ where: { room_code: req.params.room_code }, data: { elo_processed: true } });
  res.json(result);
});

// ─── GET /api/elo/leaderboard/:game_id ───────────────────────────────────────
router.get('/leaderboard/:game_id', async (req, res) => {
  const stats = await prisma.userGameStats.findMany({
    where: { game_id: req.params.game_id, elo_games: { gt: 0 } },
    orderBy: { elo_rating: 'desc' },
    take: 50,
  });
  res.json(stats);
});

// ─── GET /api/elo/user/:email — ELO del usuario en todos sus juegos ──────────
router.get('/user/:email', async (req, res) => {
  const stats = await prisma.userGameStats.findMany({
    where: { user_email: req.params.email, elo_games: { gt: 0 } },
    orderBy: { elo_rating: 'desc' },
  });
  const gameIds = [...new Set(stats.map(s => s.game_id))];
  const games = await prisma.game.findMany({
    where: { id: { in: gameIds }, elo_enabled: true },
    select: { id: true, title: true },
  });
  const gameMap = Object.fromEntries(games.map(g => [g.id, g.title]));
  res.json(stats.filter(s => gameMap[s.game_id]).map(s => ({ ...s, game_title: gameMap[s.game_id] })));
});

export default router;
