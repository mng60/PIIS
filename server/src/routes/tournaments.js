import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { advanceTournamentMatch, createMatchRoomForTournament } from '../lib/tournamentAdvance.js';

const router = Router();
const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTournamentBracket(elo) {
  if (elo >= 2000) return 'Elite';
  if (elo >= 1600) return 'Avanzado';
  if (elo >= 1200) return 'Intermedio';
  return 'Principiante';
}

function canManage(user, tournament) {
  if (user.role === 'admin') return true;
  if (user.role === 'empresa' && tournament.created_by === user.email) return true;
  return false;
}

// Seeding estándar de eliminación directa
function getSeeds(n) {
  if (n === 1) return [1];
  const prev = getSeeds(n / 2);
  const result = [];
  for (const seed of prev) result.push(seed, n + 1 - seed);
  return result;
}


// ─── GET /api/tournaments ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, created_by } = req.query;
    const where = { is_active: true };
    if (status) where.status = status;
    if (created_by) where.created_by = created_by;

    const tournaments = await prisma.tournament.findMany({ where, orderBy: { start_date: 'asc' } });

    const gameIds = [...new Set(tournaments.map(t => t.game_id))];
    const games = await prisma.game.findMany({
      where: { id: { in: gameIds } },
      select: { id: true, title: true, thumbnail: true },
    });
    const gameMap = Object.fromEntries(games.map(g => [g.id, g]));

    const counts = await prisma.tournamentParticipant.groupBy({
      by: ['tournament_id'],
      _count: { id: true },
      where: { tournament_id: { in: tournaments.map(t => t.id) } },
    });
    const countMap = Object.fromEntries(counts.map(c => [c.tournament_id, c._count.id]));

    res.json(tournaments.map(t => ({
      ...t,
      game_title: gameMap[t.game_id]?.title || t.game_id,
      game_thumbnail: gameMap[t.game_id]?.thumbnail || null,
      participant_count: countMap[t.id] || 0,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener torneos' });
  }
});

// ─── GET /api/tournaments/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const t = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' });

    const game = await prisma.game.findUnique({ where: { id: t.game_id }, select: { title: true, thumbnail: true } });
    const count = await prisma.tournamentParticipant.count({ where: { tournament_id: t.id } });

    res.json({ ...t, game_title: game?.title, game_thumbnail: game?.thumbnail, participant_count: count });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener torneo' });
  }
});

// ─── GET /api/tournaments/:id/participants ────────────────────────────────────
router.get('/:id/participants', async (req, res) => {
  try {
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournament_id: req.params.id },
      orderBy: [{ bracket_name: 'asc' }, { elo_at_signup: 'desc' }],
    });
    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener participantes' });
  }
});

// ─── GET /api/tournaments/:id/matches ────────────────────────────────────────
router.get('/:id/matches', async (req, res) => {
  try {
    const matches = await prisma.tournamentMatch.findMany({
      where: { tournament_id: req.params.id },
      orderBy: [{ bracket_name: 'asc' }, { round: 'asc' }, { match_index: 'asc' }],
    });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener partidas' });
  }
});

// ─── POST /api/tournaments ────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { role, email } = req.user;
    if (role !== 'admin' && role !== 'empresa') {
      return res.status(403).json({ error: 'Solo admin o empresa pueden crear torneos' });
    }

    const { title, game_id, start_date, end_date, ...rest } = req.body;
    if (!title || !game_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    if (role === 'empresa') {
      const game = await prisma.game.findUnique({ where: { id: game_id } });
      if (!game) return res.status(404).json({ error: 'Juego no encontrado' });
      if (game.created_by !== email) {
        return res.status(403).json({ error: 'Solo puedes crear torneos en tus propios juegos' });
      }
    }

    const tournament = await prisma.tournament.create({
      data: { title, game_id, start_date: new Date(start_date), end_date: new Date(end_date), created_by: email, ...rest },
    });
    res.status(201).json(tournament);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear torneo' });
  }
});

// ─── PATCH /api/tournaments/:id ───────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });
    if (!canManage(req.user, tournament)) return res.status(403).json({ error: 'Sin permisos' });

    const data = { ...req.body };
    if (data.start_date) data.start_date = new Date(data.start_date);
    if (data.end_date) data.end_date = new Date(data.end_date);
    delete data.created_by;

    const updated = await prisma.tournament.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar torneo' });
  }
});

// ─── DELETE /api/tournaments/:id ──────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });
    if (!canManage(req.user, tournament)) return res.status(403).json({ error: 'Sin permisos' });

    await prisma.tournamentMatch.deleteMany({ where: { tournament_id: req.params.id } });
    await prisma.tournamentParticipant.deleteMany({ where: { tournament_id: req.params.id } });
    await prisma.tournament.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar torneo' });
  }
});

// ─── POST /api/tournaments/:id/join ──────────────────────────────────────────
router.post('/:id/join', requireAuth, async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });
    if (!tournament.is_active) return res.status(400).json({ error: 'Torneo no disponible' });
    if (tournament.status !== 'upcoming') return res.status(400).json({ error: 'Las inscripciones están cerradas' });

    const existing = await prisma.tournamentParticipant.findUnique({
      where: { tournament_id_user_email: { tournament_id: tournament.id, user_email: req.user.email } },
    });
    if (existing) return res.status(400).json({ error: 'Ya estás inscrito' });

    if (tournament.max_participants) {
      const count = await prisma.tournamentParticipant.count({ where: { tournament_id: tournament.id } });
      if (count >= tournament.max_participants) return res.status(400).json({ error: 'El torneo está lleno' });
    }

    const stats = await prisma.userGameStats.findUnique({
      where: { user_email_game_id: { user_email: req.user.email, game_id: tournament.game_id } },
    });
    const elo = stats?.elo_rating ?? 1200;

    if (tournament.elo_min != null && elo < tournament.elo_min) {
      return res.status(400).json({ error: `ELO mínimo requerido: ${tournament.elo_min}` });
    }
    if (tournament.elo_max != null && elo > tournament.elo_max) {
      return res.status(400).json({ error: `ELO máximo permitido: ${tournament.elo_max}` });
    }

    const user = await prisma.user.findUnique({ where: { email: req.user.email }, select: { full_name: true } });
    const participant = await prisma.tournamentParticipant.create({
      data: {
        tournament_id: tournament.id,
        user_email: req.user.email,
        user_name: user?.full_name || req.user.email,
        elo_at_signup: elo,
        bracket_name: getTournamentBracket(elo),
      },
    });
    res.status(201).json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al inscribirse' });
  }
});

// ─── DELETE /api/tournaments/:id/join ────────────────────────────────────────
router.delete('/:id/join', requireAuth, async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });
    if (tournament.status === 'active') return res.status(400).json({ error: 'No puedes abandonar un torneo en curso' });

    await prisma.tournamentParticipant.delete({
      where: { tournament_id_user_email: { tournament_id: tournament.id, user_email: req.user.email } },
    });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'No estás inscrito' });
    res.status(500).json({ error: 'Error al abandonar el torneo' });
  }
});

// ─── POST /api/tournaments/:id/activate ──────────────────────────────────────
router.post('/:id/activate', requireAuth, async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });
    if (!canManage(req.user, tournament)) return res.status(403).json({ error: 'Sin permisos' });
    if (tournament.status !== 'upcoming') return res.status(400).json({ error: 'El torneo ya fue activado o finalizado' });

    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournament_id: tournament.id },
      orderBy: { elo_at_signup: 'desc' },
    });

    if (participants.length < 4) {
      return res.status(400).json({ error: 'Se necesitan mínimo 4 participantes para iniciar el torneo' });
    }

    // Agrupar por bracket
    const brackets = {};
    for (const p of participants) {
      if (!brackets[p.bracket_name]) brackets[p.bracket_name] = [];
      brackets[p.bracket_name].push(p);
    }

    let totalMatches = 0;

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
          },
        });

        round1Matches.push(match);
        totalMatches++;
      }

      // Procesar byes inmediatamente
      for (const match of round1Matches) {
        if (match.status === 'bye') {
          const winner = match.player1_email || match.player2_email;
          if (winner) await advanceTournamentMatch(match.id, winner);
        }
      }
    }

    await prisma.tournament.update({ where: { id: tournament.id }, data: { status: 'active' } });

    res.json({
      message: 'Torneo iniciado correctamente',
      brackets: Object.keys(brackets).length,
      matches: totalMatches,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al activar el torneo' });
  }
});

export default router;
