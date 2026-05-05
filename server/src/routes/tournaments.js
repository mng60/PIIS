import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { advanceTournamentMatch, createMatchRoomForTournament } from '../lib/tournamentAdvance.js';
import { activateTournamentById } from '../lib/tournamentScheduler.js';

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

// ─── GET /api/tournaments/my-active-match ────────────────────────────────────
router.get('/my-active-match', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const activeTournamentIds = (await prisma.tournament.findMany({
      where: { status: 'active' },
      select: { id: true },
    })).map(t => t.id);

    const match = await prisma.tournamentMatch.findFirst({
      where: {
        status: 'playing',
        tournament_id: { in: activeTournamentIds },
        OR: [{ player1_email: userEmail }, { player2_email: userEmail }],
      },
      orderBy: { created_at: 'desc' },
    });

    if (!match) return res.json(null);

    const tournament = await prisma.tournament.findUnique({
      where: { id: match.tournament_id },
      select: { id: true, title: true, game_id: true, activated_at: true },
    });

    const game = await prisma.game.findUnique({
      where: { id: tournament.game_id },
      select: { id: true, title: true },
    });

    res.json({ match, tournament, game });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener partida activa' });
  }
});

// ─── POST /api/tournaments/matches/checkin ────────────────────────────────────
router.post('/matches/checkin', requireAuth, async (req, res) => {
  try {
    const { room_code } = req.body;
    if (!room_code) return res.status(400).json({ error: 'room_code requerido' });

    const match = await prisma.tournamentMatch.findFirst({
      where: { room_code, status: 'playing' },
    });
    if (!match) return res.json({ ok: false });

    const userEmail = req.user.email;
    const isP1 = match.player1_email === userEmail;
    const isP2 = match.player2_email === userEmail;
    if (!isP1 && !isP2) return res.json({ ok: false });

    const now = new Date();
    const isFirstCheckIn = !match.player1_joined_at && !match.player2_joined_at;
    const updateData = {};
    if (isP1 && !match.player1_joined_at) updateData.player1_joined_at = now;
    if (isP2 && !match.player2_joined_at) updateData.player2_joined_at = now;

    // Start forfeit countdown from when the first player actually enters the room
    if (isFirstCheckIn && Object.keys(updateData).length > 0) {
      updateData.forfeit_after = new Date(now.getTime() + 2 * 60 * 1000);
    }

    let updatedMatch = match;
    if (Object.keys(updateData).length > 0) {
      updatedMatch = await prisma.tournamentMatch.update({ where: { id: match.id }, data: updateData });
    }

    const opponentJoined = isP1 ? updatedMatch.player2_joined_at !== null : updatedMatch.player1_joined_at !== null;

    res.json({
      ok: true,
      waiting_for_opponent: !opponentJoined,
      forfeit_at: updatedMatch.forfeit_after ? updatedMatch.forfeit_after.toISOString() : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en checkin' });
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

    const count = await prisma.tournamentParticipant.count({ where: { tournament_id: tournament.id } });
    if (count < 4) return res.status(400).json({ error: 'Se necesitan mínimo 4 participantes para iniciar el torneo' });

    const result = await activateTournamentById(tournament.id);
    if (!result) return res.status(400).json({ error: 'No se pudo activar el torneo' });

    res.json({ message: 'Torneo iniciado correctamente', ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al activar el torneo' });
  }
});

export default router;
