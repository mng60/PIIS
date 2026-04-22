import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { advanceTournamentMatch } from '../lib/tournamentAdvance.js';
import { applyElo } from '../lib/eloLib.js';

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

// GET /api/chess/my-active-games — partidas en curso del usuario autenticado
// Detecta y resuelve timeouts en segundo plano antes de devolver la lista
router.get('/my-active-games', requireAuth, async (req, res) => {
  const email = req.user.email;
  const now = Date.now();

  const rooms = await prisma.chessRoom.findMany({
    where: {
      status: 'playing',
      OR: [{ host_email: email }, { guest_email: email }],
    },
  });

  const timedOutCodes = new Set();

  for (const room of rooms) {
    try {
      const boardState = JSON.parse(room.board_state);
      const clock = boardState?.meta?.clock;
      if (!clock || !clock.lastTickAt) continue; // sin límite de tiempo

      const elapsed = now - new Date(clock.lastTickAt).getTime();
      const turn = room.current_turn; // 'white' | 'black' (white = host, black = guest)

      let winner = null;
      if (turn === 'white' && clock.whiteMs - elapsed <= 0) winner = room.guest_email;
      else if (turn === 'black' && clock.blackMs - elapsed <= 0) winner = room.host_email;

      if (!winner) continue;

      // Resolver timeout: cerrar la sala
      await prisma.chessRoom.update({
        where: { room_code: room.room_code },
        data: { status: 'finished', winner },
      });

      const loser = winner === room.host_email ? room.guest_email : room.host_email;
      const winnerName = winner === room.host_email ? room.host_name : (room.guest_name ?? 'Rival');
      const loserName = loser === room.host_email ? room.host_name : (room.guest_name ?? 'Rival');

      // Notificar a ambos jugadores
      const notifs = [
        { user_email: winner,  from_email: loser,   from_name: loserName,   result: 'win'  },
        { user_email: loser,   from_email: winner,  from_name: winnerName,  result: 'loss' },
      ];
      for (const n of notifs) {
        if (!n.user_email) continue;
        await prisma.notification.create({
          data: {
            user_email: n.user_email,
            type: 'game_timeout',
            from_email: n.from_email,
            from_name: n.from_name,
            data: { room_code: room.room_code, game_title: 'Ajedrez', result: n.result },
          },
        });
      }

      // Procesar ELO si es ranked y aún no se ha procesado
      if (room.game_mode === 'ranked' && !room.elo_processed && room.guest_email) {
        try {
          const game = await prisma.game.findFirst({ where: { game_code: 'chess-online' } });
          if (game?.elo_enabled) {
            const hostOutcome  = winner === room.host_email  ? 1 : 0;
            const guestOutcome = winner === room.guest_email ? 1 : 0;
            await applyElo({
              game_id: game.id,
              mode: 'duel',
              results: [
                { email: room.host_email,  name: room.host_name,           outcome: hostOutcome  },
                { email: room.guest_email, name: room.guest_name ?? 'Rival', outcome: guestOutcome },
              ],
            });
            await prisma.chessRoom.update({
              where: { room_code: room.room_code },
              data: { elo_processed: true },
            });
          }
        } catch {}
      }

      // Avanzar bracket de torneo si aplica
      try {
        const match = await prisma.tournamentMatch.findFirst({
          where: { room_code: room.room_code, status: { not: 'finished' } },
        });
        if (match) await advanceTournamentMatch(match.id, winner);
      } catch {}

      timedOutCodes.add(room.room_code);
    } catch {}
  }

  const active = rooms
    .filter(r => !timedOutCodes.has(r.room_code))
    .map(room => {
      const isHost = room.host_email === email;
      return {
        room_code: room.room_code,
        opponent_name: isHost ? (room.guest_name ?? 'Esperando rival') : room.host_name,
        opponent_avatar: isHost ? room.guest_avatar_url : room.host_avatar_url,
        my_color: isHost ? 'white' : 'black',
        current_turn: room.current_turn,
        is_my_turn: isHost ? room.current_turn === 'white' : room.current_turn === 'black',
        game_mode: room.game_mode,
      };
    });

  res.json(active);
});

// GET /api/chess/:room_code
router.get('/:room_code', async (req, res) => {
  const room = await prisma.chessRoom.findUnique({ where: { room_code: req.params.room_code } });
  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  res.json(room);
});

// POST /api/chess
router.post('/', requireAuth, async (req, res) => {
  const { room_code, board_state, game_mode, host_elo } = req.body;
  if (!room_code || !board_state) return res.status(400).json({ error: 'Faltan campos obligatorios' });
  const room = await prisma.chessRoom.create({
    data: {
      room_code,
      board_state,
      host_email: req.user.email,
      host_name: req.user.full_name || req.user.email,
      host_avatar_url: req.user.avatar_url || null,
      game_mode: game_mode || 'normal',
      host_elo: host_elo ?? 1200,
    },
  });
  res.status(201).json(room);
});

// PATCH /api/chess/:room_code
router.patch('/:room_code', requireAuth, async (req, res) => {
  const room = await prisma.chessRoom.update({
    where: { room_code: req.params.room_code },
    data: req.body,
  });
  if (req.body.status === 'finished') cleanupChatMessages(req.params.room_code);
  res.json(room);

  // Si la partida termina con ganador, avanzar bracket del torneo (si aplica)
  if (req.body.status === 'finished' && req.body.winner && req.body.winner !== 'draw') {
    try {
      const match = await prisma.tournamentMatch.findFirst({
        where: { room_code: req.params.room_code, status: { not: 'finished' } },
      });
      if (match) await advanceTournamentMatch(match.id, req.body.winner);
    } catch (err) {
      console.error('[Tournament] chess advance error:', err);
    }
  }
});

// DELETE /api/chess/:room_code
router.delete('/:room_code', requireAuth, async (req, res) => {
  await cleanupChatMessages(req.params.room_code);
  await prisma.chessRoom.delete({ where: { room_code: req.params.room_code } });
  res.status(204).end();
});

export default router;
