import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Posición inicial del tablero de ajedrez (misma estructura que initBoard() del frontend)
const INITIAL_CHESS_BOARD = JSON.stringify([
  ["bR","bN","bB","bQ","bK","bB","bN","bR"],
  ["bP","bP","bP","bP","bP","bP","bP","bP"],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ["wP","wP","wP","wP","wP","wP","wP","wP"],
  ["wR","wN","wB","wQ","wK","wB","wN","wR"],
]);

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function uniqueRoomCode() {
  let code, attempts = 0;
  while (attempts < 10) {
    code = genCode();
    // Check both tables
    const [session, chess] = await Promise.all([
      prisma.gameSession.findUnique({ where: { room_code: code } }),
      prisma.chessRoom.findUnique({ where: { room_code: code } }),
    ]);
    if (!session && !chess) return code;
    attempts++;
  }
  return code;
}

async function isChessGame(gameId) {
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { game_code: true, game_type: true } });
  return game?.game_code === 'chess-online' || (game?.game_type === 'builtin' && game?.game_code?.includes('chess'));
}

export async function createMatchRoomForTournament(match, gameId) {
  return createMatchRoom(match, gameId);
}

async function createMatchRoom(match, gameId) {
  const code = await uniqueRoomCode();
  const chess = await isChessGame(gameId);

  if (chess) {
    // Obtener datos de los usuarios para el ChessRoom
    const [p1, p2] = await Promise.all([
      prisma.user.findUnique({ where: { email: match.player1_email }, select: { full_name: true, avatar_url: true } }),
      prisma.user.findUnique({ where: { email: match.player2_email }, select: { full_name: true, avatar_url: true } }),
    ]);
    await prisma.chessRoom.create({
      data: {
        room_code: code,
        host_email: match.player1_email,
        host_name: match.player1_name || p1?.full_name || match.player1_email,
        host_avatar_url: p1?.avatar_url || null,
        guest_email: match.player2_email,
        guest_name: match.player2_name || p2?.full_name || match.player2_email,
        guest_avatar_url: p2?.avatar_url || null,
        board_state: INITIAL_CHESS_BOARD,
        status: 'waiting',
        current_turn: 'white',
      },
    });
  } else {
    await prisma.gameSession.create({
      data: {
        room_code: code,
        game_id: gameId,
        host_email: match.player1_email,
        host_name: match.player1_name || match.player1_email,
        guest_email: match.player2_email,
        guest_name: match.player2_name || match.player2_email,
        game_state: {},
        current_turn: 'host',
        status: 'waiting',
      },
    });
  }
  return code;
}

async function applyMatchELO(gameId, winnerEmail, loserEmail, kMultiplier) {
  try {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game?.elo_enabled) return;

    const k = Math.round((game.elo_k_factor || 32) * (kMultiplier || 1.5));
    const minR = game.elo_min_rating || 0;

    const [ws, ls] = await Promise.all([
      prisma.userGameStats.findUnique({ where: { user_email_game_id: { user_email: winnerEmail, game_id: gameId } } }),
      prisma.userGameStats.findUnique({ where: { user_email_game_id: { user_email: loserEmail, game_id: gameId } } }),
    ]);

    const wr = ws?.elo_rating ?? 1200;
    const lr = ls?.elo_rating ?? 1200;
    const expW = 1 / (1 + Math.pow(10, (lr - wr) / 400));

    const newWr = Math.max(minR, Math.round(wr + k * (1 - expW)));
    const newLr = Math.max(minR, Math.round(lr + k * (0 - (1 - expW))));

    const [wu, lu] = await Promise.all([
      prisma.user.findUnique({ where: { email: winnerEmail }, select: { full_name: true } }),
      prisma.user.findUnique({ where: { email: loserEmail }, select: { full_name: true } }),
    ]);

    await Promise.all([
      prisma.userGameStats.upsert({
        where: { user_email_game_id: { user_email: winnerEmail, game_id: gameId } },
        update: { elo_rating: newWr, elo_games: { increment: 1 } },
        create: { user_email: winnerEmail, user_name: wu?.full_name || winnerEmail, game_id: gameId, elo_rating: newWr, elo_games: 1 },
      }),
      prisma.userGameStats.upsert({
        where: { user_email_game_id: { user_email: loserEmail, game_id: gameId } },
        update: { elo_rating: newLr, elo_games: { increment: 1 } },
        create: { user_email: loserEmail, user_name: lu?.full_name || loserEmail, game_id: gameId, elo_rating: newLr, elo_games: 1 },
      }),
    ]);
  } catch (err) {
    console.error('[Tournament] applyMatchELO error:', err);
  }
}

async function applyPositionELO(tournament, allMatches) {
  try {
    const game = await prisma.game.findUnique({ where: { id: tournament.game_id } });
    if (!game?.elo_enabled) return;

    const pointsArr = JSON.parse(tournament.position_elo_points || '[100,40,10,10,-15,-15,-25,-25]');
    const minR = game.elo_min_rating || 0;

    const bracketNames = [...new Set(allMatches.map(m => m.bracket_name))];
    const ordered = [];

    for (const bracket of bracketNames) {
      const bMatches = allMatches.filter(m => m.bracket_name === bracket && m.status === 'finished');
      if (!bMatches.length) continue;
      const maxRound = Math.max(...bMatches.map(m => m.round));

      // 1st: winner of the final
      const final = bMatches.find(m => m.round === maxRound);
      if (final?.winner_email) ordered.push(final.winner_email);

      // Losers by round descending (2nd from final, 3rd/4th from semis, etc.)
      for (let r = maxRound; r >= 1; r--) {
        for (const m of bMatches.filter(m2 => m2.round === r)) {
          const loser = m.winner_email === m.player1_email ? m.player2_email : m.player1_email;
          if (loser && !ordered.includes(loser)) ordered.push(loser);
        }
      }
    }

    for (let i = 0; i < ordered.length; i++) {
      const email = ordered[i];
      const bonus = pointsArr[i] ?? pointsArr[pointsArr.length - 1] ?? -25;
      if (bonus === 0) continue;

      const existing = await prisma.userGameStats.findUnique({
        where: { user_email_game_id: { user_email: email, game_id: tournament.game_id } },
      });
      const currentElo = existing?.elo_rating ?? 1200;
      const newElo = Math.max(minR, currentElo + bonus);

      const u = await prisma.user.findUnique({ where: { email }, select: { full_name: true } });
      await prisma.userGameStats.upsert({
        where: { user_email_game_id: { user_email: email, game_id: tournament.game_id } },
        update: { elo_rating: newElo },
        create: { user_email: email, user_name: u?.full_name || email, game_id: tournament.game_id, elo_rating: newElo },
      });
    }
  } catch (err) {
    console.error('[Tournament] applyPositionELO error:', err);
  }
}

async function checkTournamentComplete(tournament) {
  const allMatches = await prisma.tournamentMatch.findMany({ where: { tournament_id: tournament.id } });
  const pending = allMatches.filter(m => m.status !== 'finished' && m.status !== 'bye');
  if (pending.length > 0) return;

  await applyPositionELO(tournament, allMatches);
  await prisma.tournament.update({ where: { id: tournament.id }, data: { status: 'finished' } });
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function advanceTournamentMatch(matchId, winnerEmail) {
  const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
  if (!match || match.status === 'finished') return;

  const loserEmail = match.player1_email === winnerEmail ? match.player2_email : match.player1_email;
  const winnerName = match.player1_email === winnerEmail ? match.player1_name : match.player2_name;

  const tournament = await prisma.tournament.findUnique({ where: { id: match.tournament_id } });

  // Apply per-match ELO (only for real matches, not byes)
  if (loserEmail && match.status !== 'bye') {
    await applyMatchELO(tournament.game_id, winnerEmail, loserEmail, tournament.tournament_k_multiplier);
  }

  await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: { winner_email: winnerEmail, status: 'finished' },
  });

  // Check if this is the final
  const bracketMatches = await prisma.tournamentMatch.findMany({
    where: { tournament_id: match.tournament_id, bracket_name: match.bracket_name },
  });
  const maxRound = Math.max(...bracketMatches.map(m => m.round));

  if (match.round === maxRound) {
    await checkTournamentComplete(tournament);
    return;
  }

  // Advance winner to next round
  const nextRound = match.round + 1;
  const nextMatchIndex = Math.floor(match.match_index / 2);
  const isPlayer1 = match.match_index % 2 === 0;

  let nextMatch = await prisma.tournamentMatch.findFirst({
    where: {
      tournament_id: match.tournament_id,
      bracket_name: match.bracket_name,
      round: nextRound,
      match_index: nextMatchIndex,
    },
  });

  const updateData = isPlayer1
    ? { player1_email: winnerEmail, player1_name: winnerName }
    : { player2_email: winnerEmail, player2_name: winnerName };

  if (!nextMatch) {
    nextMatch = await prisma.tournamentMatch.create({
      data: {
        tournament_id: match.tournament_id,
        bracket_name: match.bracket_name,
        round: nextRound,
        match_index: nextMatchIndex,
        status: 'pending',
        ...updateData,
      },
    });
  } else {
    nextMatch = await prisma.tournamentMatch.update({
      where: { id: nextMatch.id },
      data: updateData,
    });
  }

  // If both players are set, create the room
  if (nextMatch.player1_email && nextMatch.player2_email) {
    const code = await createMatchRoom(nextMatch, tournament.game_id);
    await prisma.tournamentMatch.update({
      where: { id: nextMatch.id },
      data: { room_code: code, status: 'playing' },
    });
  }
}
