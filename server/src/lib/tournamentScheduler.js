import { PrismaClient } from '@prisma/client';
import { advanceTournamentMatch, createMatchRoomForTournament } from './tournamentAdvance.js';

const prisma = new PrismaClient();

const FORFEIT_DELAY_MS = 2 * 60 * 1000; // 2 minutos

// ─── Helpers de seeding (copiados del route para reutilización) ───────────────

function getTournamentBracket(elo) {
  if (elo >= 2000) return 'Elite';
  if (elo >= 1600) return 'Avanzado';
  if (elo >= 1200) return 'Intermedio';
  return 'Principiante';
}

function getSeeds(n) {
  if (n === 1) return [1];
  const prev = getSeeds(n / 2);
  const result = [];
  for (const seed of prev) result.push(seed, n + 1 - seed);
  return result;
}

// ─── Lógica de activación ─────────────────────────────────────────────────────

export async function activateTournamentById(tournamentId) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament || tournament.status !== 'upcoming') return null;

  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournament_id: tournament.id },
    orderBy: { elo_at_signup: 'desc' },
  });

  if (participants.length < 4) return null;

  const brackets = {};
  for (const p of participants) {
    if (!brackets[p.bracket_name]) brackets[p.bracket_name] = [];
    brackets[p.bracket_name].push(p);
  }

  let totalMatches = 0;
  const now = new Date();
  const forfeitAfter = new Date(now.getTime() + FORFEIT_DELAY_MS);

  for (const [bracketName, players] of Object.entries(brackets)) {
    if (players.length < 2) continue;

    players.sort((a, b) => b.elo_at_signup - a.elo_at_signup);
    const n = players.length;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))));
    const seeds = getSeeds(bracketSize);
    const numMatches = bracketSize / 2;
    const round1Matches = [];

    for (let i = 0; i < numMatches; i++) {
      const s1 = seeds[i * 2] - 1;
      const s2 = seeds[i * 2 + 1] - 1;
      const p1 = players[s1] ?? null;
      const p2 = players[s2] ?? null;

      if (!p1 && !p2) continue;

      const isBye = !p1 || !p2;
      const actualP1 = p1 || p2;
      const actualP2 = p1 ? p2 : null;

      let room_code = null;
      if (!isBye && actualP1 && actualP2) {
        room_code = await createMatchRoomForTournament(
          {
            player1_email: actualP1.user_email,
            player1_name: actualP1.user_name,
            player2_email: actualP2.user_email,
            player2_name: actualP2.user_name,
          },
          tournament.game_id
        );
      }

      const match = await prisma.tournamentMatch.create({
        data: {
          tournament_id: tournament.id,
          bracket_name: bracketName,
          round: 1,
          match_index: i,
          player1_email: actualP1?.user_email || null,
          player1_name: actualP1?.user_name || null,
          player2_email: actualP2?.user_email || null,
          player2_name: actualP2?.user_name || null,
          room_code,
          status: isBye ? 'bye' : 'playing',
          forfeit_after: !isBye ? forfeitAfter : null,
        },
      });

      round1Matches.push(match);
      totalMatches++;
    }

    for (const match of round1Matches) {
      if (match.status === 'bye') {
        const winner = match.player1_email || match.player2_email;
        if (winner) await advanceTournamentMatch(match.id, winner);
      }
    }
  }

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: 'active', activated_at: now },
  });

  console.log(`[Scheduler] Torneo "${tournament.title}" activado con ${totalMatches} partidas.`);
  return { brackets: Object.keys(brackets).length, matches: totalMatches };
}

// ─── Comprobación de torneos programados ─────────────────────────────────────

async function checkScheduledTournaments() {
  try {
    const now = new Date();
    const due = await prisma.tournament.findMany({
      where: { status: 'upcoming', is_active: true, start_date: { lte: now } },
    });

    for (const t of due) {
      await activateTournamentById(t.id).catch(err =>
        console.error(`[Scheduler] Error activando torneo ${t.id}:`, err)
      );
    }
  } catch (err) {
    console.error('[Scheduler] checkScheduledTournaments error:', err);
  }
}

// ─── Forfeit por inactividad ──────────────────────────────────────────────────

async function checkForfeitMatches() {
  try {
    const now = new Date();
    const matches = await prisma.tournamentMatch.findMany({
      where: { status: 'playing', forfeit_after: { lte: now } },
    });

    for (const match of matches) {
      if (!match.player1_email || !match.player2_email) continue;

      const p1Joined = match.player1_joined_at !== null;
      const p2Joined = match.player2_joined_at !== null;

      if (p1Joined && !p2Joined) {
        console.log(`[Scheduler] Forfeit: ${match.player2_email} no se conectó. Gana ${match.player1_email}`);
        await advanceTournamentMatch(match.id, match.player1_email).catch(err =>
          console.error('[Scheduler] Error en forfeit:', err)
        );
      } else if (!p1Joined && p2Joined) {
        console.log(`[Scheduler] Forfeit: ${match.player1_email} no se conectó. Gana ${match.player2_email}`);
        await advanceTournamentMatch(match.id, match.player2_email).catch(err =>
          console.error('[Scheduler] Error en forfeit:', err)
        );
      }
      // Si ninguno se conectó: no hacemos forfeit (dejar la partida sin resolver)
    }
  } catch (err) {
    console.error('[Scheduler] checkForfeitMatches error:', err);
  }
}

// ─── Arranque ─────────────────────────────────────────────────────────────────

export function startSchedulers() {
  // Comprobar torneos que deben iniciarse (cada 60 s)
  setInterval(checkScheduledTournaments, 60_000);
  // Comprobar forfeits (cada 30 s)
  setInterval(checkForfeitMatches, 30_000);

  // Ejecución inmediata al arrancar
  checkScheduledTournaments();
  checkForfeitMatches();

  console.log('[Scheduler] Schedulers de torneos iniciados.');
}
