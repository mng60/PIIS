import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/auth.js';
import { isDatabaseConnectionError } from '../mockData.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/tournaments
router.get('/', async (req, res) => {
  const { status } = req.query;
  let tournaments;
  try {
    tournaments = await prisma.tournament.findMany({
      where: { is_active: true, ...(status && { status }) },
      orderBy: { start_date: 'asc' },
    });
  } catch (error) {
    if (!isDatabaseConnectionError(error)) throw error;
    tournaments = [];
  }
  res.json(tournaments);
});

// GET /api/tournaments/:id
router.get('/:id', async (req, res) => {
  const t = await prisma.tournament.findUnique({ where: { id: req.params.id } });
  if (!t) return res.status(404).json({ error: 'Torneo no encontrado' });
  res.json(t);
});

// POST /api/tournaments (admin)
router.post('/', requireAdmin, async (req, res) => {
  const { title, game_id, start_date, end_date, ...rest } = req.body;
  if (!title || !game_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const tournament = await prisma.tournament.create({
    data: { title, game_id, start_date: new Date(start_date), end_date: new Date(end_date), ...rest },
  });
  res.status(201).json(tournament);
});

// PATCH /api/tournaments/:id (admin)
router.patch('/:id', requireAdmin, async (req, res) => {
  const data = { ...req.body };
  if (data.start_date) data.start_date = new Date(data.start_date);
  if (data.end_date) data.end_date = new Date(data.end_date);
  const t = await prisma.tournament.update({ where: { id: req.params.id }, data });
  res.json(t);
});

// DELETE /api/tournaments/:id (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.tournament.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
