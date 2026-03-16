import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

await prisma.$disconnect();
