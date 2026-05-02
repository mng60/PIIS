import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function calcEloDuel(ownRating, oppRating, score, kFactor) {
  const expected = 1 / (1 + Math.pow(10, (oppRating - ownRating) / 400));
  return Math.round(ownRating + kFactor * (score - expected));
}

function calcEloPosition(currentRating, position, positionPoints) {
  const delta = positionPoints[position] ?? 0;
  return Math.max(0, currentRating + delta);
}

export async function getOrCreateStats(email, name, gameId) {
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
export async function applyElo({ game_id, mode, results }) {
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
