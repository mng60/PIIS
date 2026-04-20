import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const PUBLIC_USER = { email: true, full_name: true, avatar_url: true, xp: true };

async function getSenderName(email) {
  const u = await prisma.user.findUnique({ where: { email }, select: { full_name: true } });
  return u?.full_name || email;
}

// GET /api/friends — lista de amigos aceptados
router.get('/', requireAuth, async (req, res) => {
  const me = req.user.email;
  const friendships = await prisma.friendship.findMany({
    where: { status: 'accepted', OR: [{ sender_email: me }, { receiver_email: me }] },
  });
  const emails = friendships.map(f => f.sender_email === me ? f.receiver_email : f.sender_email);
  const friends = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: PUBLIC_USER,
  });
  res.json(friends);
});

// GET /api/friends/requests — solicitudes recibidas pendientes
router.get('/requests', requireAuth, async (req, res) => {
  const requests = await prisma.friendship.findMany({
    where: { receiver_email: req.user.email, status: 'pending' },
    orderBy: { created_at: 'desc' },
  });
  const senders = await prisma.user.findMany({
    where: { email: { in: requests.map(r => r.sender_email) } },
    select: { email: true, full_name: true, avatar_url: true },
  });
  const map = Object.fromEntries(senders.map(s => [s.email, s]));
  res.json(requests.map(r => ({
    id: r.id,
    sender_email: r.sender_email,
    sender_name: map[r.sender_email]?.full_name,
    sender_avatar: map[r.sender_email]?.avatar_url,
    created_at: r.created_at,
  })));
});

// GET /api/friends/blocked — usuarios bloqueados por mí
router.get('/blocked', requireAuth, async (req, res) => {
  const blocks = await prisma.block.findMany({ where: { blocker_email: req.user.email } });
  const users = await prisma.user.findMany({
    where: { email: { in: blocks.map(b => b.blocked_email) } },
    select: { email: true, full_name: true, avatar_url: true },
  });
  const blockMap = Object.fromEntries(blocks.map(b => [b.blocked_email, b.created_at]));
  res.json(users.map(u => ({ ...u, blocked_at: blockMap[u.email] })));
});

// GET /api/friends/status/:email — relación con otro usuario
router.get('/status/:email', requireAuth, async (req, res) => {
  const me = req.user.email;
  const other = req.params.email;
  const [friendship, block] = await Promise.all([
    prisma.friendship.findFirst({
      where: { OR: [{ sender_email: me, receiver_email: other }, { sender_email: other, receiver_email: me }] },
    }),
    prisma.block.findFirst({
      where: { OR: [{ blocker_email: me, blocked_email: other }, { blocker_email: other, blocked_email: me }] },
    }),
  ]);
  res.json({
    friendship: friendship ? { id: friendship.id, status: friendship.status, i_sent: friendship.sender_email === me } : null,
    blocked_by_me: block?.blocker_email === me,
    blocked_by_them: block?.blocker_email === other,
  });
});

// POST /api/friends/request — enviar solicitud
router.post('/request', requireAuth, async (req, res) => {
  const { target_email } = req.body;
  const me = req.user.email;
  if (target_email === me) return res.status(400).json({ error: 'No puedes enviarte una solicitud a ti mismo' });

  const block = await prisma.block.findFirst({
    where: { OR: [{ blocker_email: me, blocked_email: target_email }, { blocker_email: target_email, blocked_email: me }] },
  });
  if (block) return res.status(403).json({ error: 'No puedes enviar solicitud a este usuario' });

  const existing = await prisma.friendship.findFirst({
    where: { OR: [{ sender_email: me, receiver_email: target_email }, { sender_email: target_email, receiver_email: me }] },
  });
  if (existing) return res.status(409).json({ error: 'Ya existe una relación con este usuario', status: existing.status });

  const target = await prisma.user.findUnique({ where: { email: target_email }, select: { email: true } });
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  const friendship = await prisma.friendship.create({ data: { sender_email: me, receiver_email: target_email } });
  const fromName = await getSenderName(me);

  await prisma.notification.create({
    data: { user_email: target_email, type: 'friend_request', from_email: me, from_name: fromName, data: { friendship_id: friendship.id } },
  });

  res.json({ ok: true, id: friendship.id });
});

// PATCH /api/friends/request/:id/accept
router.patch('/request/:id/accept', requireAuth, async (req, res) => {
  const f = await prisma.friendship.findUnique({ where: { id: req.params.id } });
  if (!f || f.receiver_email !== req.user.email) return res.status(404).json({ error: 'Solicitud no encontrada' });
  if (f.status !== 'pending') return res.status(400).json({ error: 'La solicitud ya fue procesada' });

  await prisma.friendship.update({ where: { id: f.id }, data: { status: 'accepted' } });

  const fromName = await getSenderName(req.user.email);
  await prisma.notification.create({
    data: { user_email: f.sender_email, type: 'friend_accepted', from_email: req.user.email, from_name: fromName },
  });
  await prisma.notification.updateMany({
    where: { user_email: req.user.email, type: 'friend_request', from_email: f.sender_email, is_read: false },
    data: { is_read: true },
  });

  res.json({ ok: true });
});

// PATCH /api/friends/request/:id/reject
router.patch('/request/:id/reject', requireAuth, async (req, res) => {
  const f = await prisma.friendship.findUnique({ where: { id: req.params.id } });
  if (!f || f.receiver_email !== req.user.email) return res.status(404).json({ error: 'Solicitud no encontrada' });

  await prisma.friendship.update({ where: { id: f.id }, data: { status: 'rejected' } });
  await prisma.notification.updateMany({
    where: { user_email: req.user.email, type: 'friend_request', from_email: f.sender_email, is_read: false },
    data: { is_read: true },
  });

  res.json({ ok: true });
});

// POST /api/friends/block — bloquear usuario
router.post('/block', requireAuth, async (req, res) => {
  const { target_email } = req.body;
  const me = req.user.email;
  if (target_email === me) return res.status(400).json({ error: 'No puedes bloquearte a ti mismo' });

  await prisma.friendship.deleteMany({
    where: { OR: [{ sender_email: me, receiver_email: target_email }, { sender_email: target_email, receiver_email: me }] },
  });

  await prisma.block.upsert({
    where: { blocker_email_blocked_email: { blocker_email: me, blocked_email: target_email } },
    create: { blocker_email: me, blocked_email: target_email },
    update: {},
  });

  res.json({ ok: true });
});

// DELETE /api/friends/block/:email — desbloquear
router.delete('/block/:email', requireAuth, async (req, res) => {
  await prisma.block.deleteMany({ where: { blocker_email: req.user.email, blocked_email: req.params.email } });
  res.json({ ok: true });
});

// DELETE /api/friends/:email — eliminar amigo o cancelar solicitud enviada
router.delete('/:email', requireAuth, async (req, res) => {
  const me = req.user.email;
  const other = req.params.email;
  await prisma.friendship.deleteMany({
    where: { OR: [{ sender_email: me, receiver_email: other }, { sender_email: other, receiver_email: me }] },
  });
  res.json({ ok: true });
});

export default router;
