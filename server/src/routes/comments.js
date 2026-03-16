import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/comments?game_id=xxx
router.get('/', async (req, res) => {
  const { game_id } = req.query;
  if (!game_id) return res.status(400).json({ error: 'game_id requerido' });
  const comments = await prisma.comment.findMany({
    where: { game_id },
    orderBy: { created_at: 'desc' },
  });
  res.json(comments);
});

// POST /api/comments
router.post('/', requireAuth, async (req, res) => {
  const { game_id, content, rating } = req.body;
  if (!game_id || !content) return res.status(400).json({ error: 'Faltan campos obligatorios' });

  const comment = await prisma.comment.create({
    data: {
      game_id,
      content,
      user_email: req.user.email,
      user_name: req.user.full_name || req.user.email,
      ...(rating !== undefined && { rating: parseFloat(rating) }),
    },
  });

  // Update game rating
  if (rating !== undefined) {
    await prisma.game.update({
      where: { id: game_id },
      data: { rating_sum: { increment: parseFloat(rating) }, rating_count: { increment: 1 } },
    });
  }

  res.status(201).json(comment);
});

// DELETE /api/comments/:id (admin or author)
router.delete('/:id', requireAuth, async (req, res) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
  if (req.user.role !== 'admin' && comment.user_email !== req.user.email) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  await prisma.comment.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
