import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/games/mine - games created by the authenticated user (before /:id to avoid conflict)
router.get('/mine', requireAuth, async (req, res) => {
  const games = await prisma.game.findMany({
    where: { created_by: req.user.email },
    orderBy: { created_at: 'desc' },
  });
  res.json({ games, total: games.length });
});

// GET /api/games
router.get('/', async (req, res) => {
  const { category, game_type, featured, search, all, limit = '50', offset = '0' } = req.query;

  const where = {
    // ?all=true skips is_active filter (for admin game management)
    ...(all !== 'true' && { is_active: true }),
    ...(category && { category }),
    ...(game_type && { game_type }),
    ...(featured === 'true' && { is_featured: true }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [games, total] = await prisma.$transaction([
    prisma.game.findMany({ where, orderBy: { created_at: 'desc' }, take: parseInt(limit), skip: parseInt(offset) }),
    prisma.game.count({ where }),
  ]);
  res.json({ games, total });
});

// GET /api/games/:id
router.get('/:id', async (req, res) => {
  const game = await prisma.game.findUnique({ where: { id: req.params.id } });
  if (!game) return res.status(404).json({ error: 'Juego no encontrado' });
  res.json(game);
});

// POST /api/games (auth required)
router.post('/', requireAuth, async (req, res) => {
  const { title, category, game_type, ...rest } = req.body;
  if (!title || !category || !game_type) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const game = await prisma.game.create({
    data: { title, category, game_type, publisher: req.user.full_name || req.user.email, created_by: req.user.email, ...rest },
  });
  res.status(201).json(game);
});

// PATCH /api/games/:id (admin or creator)
router.patch('/:id', requireAuth, async (req, res) => {
  const game = await prisma.game.findUnique({ where: { id: req.params.id } });
  if (!game) return res.status(404).json({ error: 'Juego no encontrado' });
  if (req.user.role !== 'admin' && game.created_by !== req.user.email) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  const updated = await prisma.game.update({ where: { id: req.params.id }, data: req.body });
  res.json(updated);
});

// DELETE /api/games/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.game.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// POST /api/games/:id/play - increment plays_count
router.post('/:id/play', async (req, res) => {
  const game = await prisma.game.update({
    where: { id: req.params.id },
    data: { plays_count: { increment: 1 } },
    select: { id: true, plays_count: true },
  });
  res.json(game);
});

export default router;
