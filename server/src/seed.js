import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const users = [
  { email: 'admin@playcraft.com',      full_name: 'Admin PlayCraft',   password: 'admin123',    role: 'admin'   },
  { email: 'usuario@playcraft.com',    full_name: 'Usuario Normal',    password: 'user123',     role: 'user'    },
  { email: 'empresa@playcraft.com',    full_name: 'Empresa PlayCraft', password: 'empresa123',  role: 'empresa' },
  { email: 'gonzalo1904@playcraft.com', full_name: 'gonzalo1904',      password: 'gonzalo1904', role: 'empresa' },
];

const games = [
  {
    title: 'Snake',
    description: 'El clásico juego de la serpiente. Come, crece y no te choques.',
    full_description: 'Controla la serpiente con las flechas del teclado o WASD. Come la comida roja para crecer y sumar puntos. La comida dorada aparece de vez en cuando y vale 30 puntos. Cada 50 puntos subes de nivel y la serpiente va más rápida. Elige entre 4 dificultades y activa el modo paredes teletransportadoras si quieres un reto diferente.',
    category: 'arcade',
    game_type: 'builtin',
    game_code: 'snake',
    is_active: true,
    is_multiplayer: false,
    publisher: 'PlayCraft',
    created_by: 'admin@playcraft.com',
  },
  {
    title: 'Pong',
    description: 'El clásico ping pong arcade. Juega contra la máquina.',
    full_description: 'Mueve tu paleta con el ratón o tocando la pantalla. Evita que la pelota pase por tu lado. La velocidad aumenta con cada rebote. ¿Cuántos puntos puedes conseguir?',
    category: 'arcade',
    game_type: 'builtin',
    game_code: 'pong',
    is_active: true,
    is_multiplayer: false,
    publisher: 'PlayCraft',
    created_by: 'admin@playcraft.com',
  },
  {
    title: 'Ajedrez Online',
    description: 'Juega al ajedrez en tiempo real contra otro jugador.',
    full_description: 'Crea una sala y comparte el código con tu rival, o únete a una sala existente. El juego sigue las reglas estándar del ajedrez. Disponible chat en tiempo real durante la partida.',
    category: 'estrategia',
    game_type: 'builtin',
    game_code: 'chess-online',
    is_active: true,
    is_multiplayer: true,
    publisher: 'PlayCraft',
    created_by: 'admin@playcraft.com',
  },
  {
    title: 'Settlers of Catan',
    description: 'Clon web multijugador de Settlers of Catan.',
    full_description: 'Juego multijugador web embebido en PIISy mediante iframe para jugar sin salir de la plataforma.',
    category: 'arcade',
    game_type: 'html5',
    game_code: 'settlers-of-catan',
    game_url: 'https://catan-rouge.vercel.app/?hideChat=1',
    is_active: true,
    is_multiplayer: true,
    publisher: 'gonzalo1904',
    created_by: 'gonzalo1904@playcraft.com',
  },
];

async function main() {
  console.log('Sembrando usuarios...\n');
  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { full_name: u.full_name, role: u.role },
      create: { email: u.email, full_name: u.full_name, password: hashed, role: u.role },
    });
    console.log(`  [${u.role.padEnd(7)}]  ${u.email}  /  ${u.password}`);
  }

  console.log('\nSembrando juegos...\n');
  for (const g of games) {
    const existing = await prisma.game.findFirst({
      where: {
        OR: [
          { game_code: g.game_code },
          ...(g.game_code === 'settlers-of-catan' ? [{ game_code: 'settlers-of-hexagonia' }, { game_code: 'traders-of-nadak' }, { game_code: 'external-demo' }] : []),
        ],
      },
    });
    if (existing) {
      await prisma.game.update({ where: { id: existing.id }, data: g });
      console.log(`  [actualizado]  ${g.title}`);
    } else {
      await prisma.game.create({ data: g });
      console.log(`  [creado]       ${g.title}`);
    }
  }

  console.log('\nListo.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
