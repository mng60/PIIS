import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

function requireAdminOrEmpresa(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'empresa')) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

async function getOwnedGame(gameId, user) {
  if (!gameId) return { error: 'Falta game_id', status: 400 };
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return { error: 'Juego no encontrado', status: 404 };
  if (user.role === 'empresa' && game.created_by !== user.email) {
    return { error: 'No tienes permiso sobre este juego', status: 403 };
  }
  return { game };
}

// POST /api/maintenance/reset-scores  body: { game_id }
// Resetea los campos de puntuación de todos los usuarios para ese juego
// (conserva plays_count y time_played para la gamificación)
router.post('/reset-scores', requireAuth, requireAdminOrEmpresa, async (req, res) => {
  try {
    const result = await getOwnedGame(req.body.game_id, req.user);
    if (result.error) return res.status(result.status).json({ error: result.error });
    await prisma.userGameStats.updateMany({
      where: { game_id: req.body.game_id },
      data:  { best_score: 0, last_score: 0, total_score: 0, wins_count: 0 },
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/maintenance/reset-plays  body: { game_id }
// Resetea el contador global de partidas del juego y el plays_count por usuario
router.post('/reset-plays', requireAuth, requireAdminOrEmpresa, async (req, res) => {
  try {
    const result = await getOwnedGame(req.body.game_id, req.user);
    if (result.error) return res.status(result.status).json({ error: result.error });
    await Promise.all([
      prisma.game.update({ where: { id: req.body.game_id }, data: { plays_count: 0 } }),
      prisma.userGameStats.updateMany({ where: { game_id: req.body.game_id }, data: { plays_count: 0, time_played: 0 } }),
    ]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/maintenance/reset-game  body: { game_id }  — borra todo del juego
router.post('/reset-game', requireAuth, requireAdminOrEmpresa, async (req, res) => {
  try {
    const result = await getOwnedGame(req.body.game_id, req.user);
    if (result.error) return res.status(result.status).json({ error: result.error });
    await Promise.all([
      prisma.userGameStats.deleteMany({ where: { game_id: req.body.game_id } }),
      prisma.game.update({ where: { id: req.body.game_id }, data: { plays_count: 0 } }),
    ]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/maintenance/reset-user-scores  body: { user_email }  — admin only
router.post('/reset-user-scores', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  const { user_email } = req.body;
  if (!user_email) return res.status(400).json({ error: 'Falta user_email' });
  try {
    await prisma.userGameStats.deleteMany({ where: { user_email } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
