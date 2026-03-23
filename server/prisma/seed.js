import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Users ──────────────────────────────────────────────────────────────────

const users = [
  { email: 'admin@playcraft.com',   password: 'admin123',   full_name: 'Admin PlayCraft', role: 'admin'   },
  { email: 'usuario@playcraft.com', password: 'user1234',   full_name: 'Usuario Normal',  role: 'user'    },
  { email: 'empresa@playcraft.com', password: 'empresa123', full_name: 'Empresa Demo',    role: 'empresa' },
];

for (const u of users) {
  const hashed = await bcrypt.hash(u.password, 10);
  await prisma.user.upsert({
    where:  { email: u.email },
    update: { password: hashed, full_name: u.full_name, role: u.role },
    create: { email: u.email, password: hashed, full_name: u.full_name, role: u.role },
  });
  console.log(`✓ ${u.role}: ${u.email} / ${u.password}`);
}

// ── Games (importados de producción, contadores a cero) ────────────────────
// plays_count, rating_sum y rating_count se resetean porque los scores y
// comentarios de prod no se importan. En updates sucesivos solo se actualizan
// los campos de contenido, no los contadores locales.

const PROD_API = 'https://piis-production.up.railway.app/api';

const response = await fetch(`${PROD_API}/games?all=true&limit=200`);
const { games } = await response.json();

for (const game of games) {
  const { id, created_at, updated_at, plays_count, rating_sum, rating_count, ...fields } = game;
  await prisma.game.upsert({
    where:  { id },
    update: { ...fields },
    create: { id, ...fields, plays_count: 0, rating_sum: 0, rating_count: 0 },
  });
}
console.log(`✓ ${games.length} juegos importados de producción`);

await prisma.$disconnect();
