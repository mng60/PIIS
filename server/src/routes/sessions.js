import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

async function cleanupChatMessages(room_code) {
  try {
    const messages = await prisma.chatMessage.findMany({ where: { session_id: room_code }, select: { id: true } });
    if (!messages.length) return;
    const ids = messages.map(m => m.id);
    const reported = await prisma.report.findMany({ where: { target_id: { in: ids }, target_kind: 'chat_message' }, select: { target_id: true } });
    const reportedIds = new Set(reported.map(r => r.target_id));
    const toDelete = ids.filter(id => !reportedIds.has(id));
    if (toDelete.length) await prisma.chatMessage.deleteMany({ where: { id: { in: toDelete } } });
  } catch { /* silencioso */ }
}

// GET /api/sessions/:room_code
router.get('/:room_code', async (req, res) => {
  const session = await prisma.gameSession.findUnique({ where: { room_code: req.params.room_code } });
  if (!session) return res.status(404).json({ error: 'Sala no encontrada' });
  
  // Garantizar que participants sea un array
  if (!session.participants) session.participants = [];
  else if (typeof session.participants === 'string') session.participants = JSON.parse(session.participants);

  res.json(session);
});

// POST /api/sessions — Crear sala
router.post('/', requireAuth, async (req, res) => {
  const { room_code, game_id, game_state } = req.body;
  
  if (!room_code || !game_id) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const session = await prisma.gameSession.create({
      data: {
        room_code,
        game_id,
        host_email: req.user.email,
        host_name: req.user.full_name || req.user.email,
        current_turn: "0", 
        participants: [
          { 
            email: req.user.email, 
            name: req.user.full_name || req.user.email,
            role: 'host',
            joined_at: new Date()
          }
        ],
        game_state: game_state ?? { actions: [] },
      },
    });
    res.status(201).json(session);
  } catch (error) {
    console.error("ERROR AL CREAR SALA:", error);
    res.status(500).json({ error: 'No se pudo crear la sala. Revisa la consola del servidor.' });
  }
});

// POST /api/sessions/:code/join
router.post('/:code/join', requireAuth, async (req, res) => {
  const { code } = req.params;
  const user = req.user;

  try {
    const session = await prisma.gameSession.findUnique({ where: { room_code: code } });
    if (!session) return res.status(404).json({ error: 'Sala no encontrada' });

    // PARCHE VITAL: Garantizar que participants es un array antes de usar .some()
    let currentParticipants = [];
    if (session.participants) {
        currentParticipants = typeof session.participants === 'string' 
            ? JSON.parse(session.participants) 
            : session.participants;
    }
    
    // Migración retroactiva si participants está vacío pero hay host viejo
    if (currentParticipants.length === 0 && session.host_email) {
        currentParticipants.push({ email: session.host_email, name: session.host_name, role: 'host' });
    }

    const isAlreadyIn = currentParticipants.some(p => p.email === user.email);
    if (isAlreadyIn) {
        session.participants = currentParticipants;
        return res.json(session);
    }

    const MAX_PLAYERS = 4; 
    if (currentParticipants.length >= MAX_PLAYERS) return res.status(400).json({ error: 'La sala está llena' });

    const updatedParticipants = [
      ...currentParticipants,
      { 
        email: user.email, 
        name: user.full_name || user.email.split('@')[0],
        joined_at: new Date()
      }
    ];

    const newStatus = updatedParticipants.length >= 2 ? 'playing' : 'waiting';

    const updatedSession = await prisma.gameSession.update({
      where: { room_code: code },
      data: {
        participants: updatedParticipants,
        status: newStatus
      },
    });

    res.json(updatedSession);
  } catch (error) {
    console.error("ERROR AL UNIRSE:", error);
    res.status(500).json({ error: 'Error al unirse' });
  }
});

// PATCH /api/sessions/:room_code
router.patch('/:room_code', requireAuth, async (req, res) => {
  try {
    const { room_code } = req.params;
    
    const session = await prisma.gameSession.findUnique({ where: { room_code } });
    if (!session) return res.status(404).json({ error: 'Sala no encontrada' });

    const updatedSession = await prisma.gameSession.update({
      where: { room_code },
      data: req.body, 
    });

    res.json(updatedSession);
  } catch (error) {
    console.error("ERROR AL ACTUALIZAR:", error);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// DELETE /api/sessions/:room_code
router.delete('/:room_code', requireAuth, async (req, res) => {
  try {
      await cleanupChatMessages(req.params.room_code);
      await prisma.gameSession.delete({ where: { room_code: req.params.room_code } });
      res.status(204).end();
  } catch(error) {
      console.error("ERROR AL ELIMINAR:", error);
      res.status(500).json({ error: 'Error al eliminar la sala' });
  }
});

export default router;