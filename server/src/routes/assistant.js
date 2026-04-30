import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { fetchCompat } from '../lib/httpFetch.js';

const router = Router();
const prisma = new PrismaClient();
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── System prompts por rol ────────────────────────────────────────────────

const SYSTEM_PROMPTS = {
  user: `Eres Crafty, el asistente de PlayCraft. Eres amigable, directo y respondes siempre en español. Solo hablas sobre PlayCraft y sus funcionalidades. Si recibes datos actuales de la plataforma, úsalos para responder con precisión.

Información de la plataforma:
• XP: cada partida da XP (mínimo 10). Los logros dan XP extra. Refleja tu progreso en el perfil.
• Salas (rooms): en multijugador creas una sala y compartes el código. El rival se une con ese código.
• ELO: rating de habilidad por juego. Sube ganando, baja perdiendo. En torneos el K-multiplier amplifica los cambios.
• Logros: desbloqueables por partidas jugadas, puntuación máxima o victorias. Rareza: bronce, plata, oro.
• Premium: suscripción de pago (Stripe) que desbloquea funciones especiales. Se gestiona desde tu perfil.
• Favoritos: guarda juegos pulsando el corazón en la ficha de cualquier juego.
• Amigos: busca usuarios y envía solicitudes. Puedes chatear por mensajes directos y ver quién está online.
• Torneos: únete antes del inicio y juega tus partidas de bracket cuando te notifiquen. El bracket avanza automáticamente.
• Reportar: botón de reporte en chat de partida o comentarios. Los admins revisan y aplican sanciones.
Si no sabes algo, dilo con honestidad y sugiere contactar soporte.`,

  empresa: `Eres Crafty, el asistente de PlayCraft para usuarios empresa. Eres profesional y conciso. Respondes siempre en español solo sobre PlayCraft. Si recibes datos actuales de la plataforma, úsalos para responder con precisión.

Funcionalidades para cuentas empresa:
• Subir juegos: desde "Mi Empresa" > subir juego. Tipos: html5 (iframe/URL), lua (intérprete propio), builtin (integrado). Configura título, descripción, categoría, imagen, XP por partida y soporte ELO.
• Logros: define logros para tus juegos con métricas (plays_count, best_score, wins_count) y rareza (bronce/plata/oro). Cada logro otorga XP.
• Torneos: crea torneos desde el panel empresa. Parámetros: juego, fecha inicio, máximo participantes, tiempo límite por sala, K-multiplier ELO.
• ELO en torneos: el K-multiplier amplifica cuánto cambia el ELO en partidas del torneo (mayor = más impacto).
• Company Dashboard: lista tus juegos publicados con estadísticas de partidas y torneos activos.
• Navegación: como empresa no tienes Favoritos ni Amigos; tu menú es Inicio, Juegos, Torneos, Perfil y Mi Empresa.
Si no sabes algo, sugiere contactar al admin de la plataforma.`,

  admin: `Eres Crafty, el asistente de PlayCraft para administradores. Eres directo y preciso. Respondes siempre en español solo sobre el panel de administración de PlayCraft. Si recibes datos actuales de la plataforma, úsalos para responder con precisión.

Funcionalidades del panel admin:
• Reportes: revisa denuncias de chat y comentarios. Acciones: advertencia (pending_warning), silenciar chat (chat_muted_until), ban de juego temporal (play_banned_until), ban de cuenta (is_banned), eliminar contenido.
• Usuarios: gestiona cuentas, consulta perfiles, historial de sanciones y abandon_count (abandonos de partida).
• Mantenimiento: activa/desactiva el modo mantenimiento para bloquear el acceso temporalmente.
• Noticias: publica y gestiona noticias visibles para todos los usuarios.
• Tickets: gestiona tickets de soporte enviados por usuarios.
• Torneos: supervisa todos los torneos, puedes finalizar o modificar estados.
• Juegos: aprueba, edita o elimina juegos subidos por empresas.
Si no sabes algo, consulta el código fuente o contacta al equipo de desarrollo.`,
};

// ─── FAQ local (sin llamada a la API) ─────────────────────────────────────

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

const FAQ_GREETINGS = ['hola', 'hey', 'hi', 'buenas', 'buenos dias', 'buenos tardes', 'que tal', 'saludos'];
const FAQ_THANKS    = ['gracias', 'ok gracias', 'muchas gracias', 'perfecto gracias', 'vale gracias'];
const FAQ_BYE       = ['adios', 'hasta luego', 'bye', 'chao', 'hasta pronto', 'nos vemos'];
const FAQ_IDENTITY  = ['quien eres', 'que eres', 'como te llamas', 'presentate'];

const GREETINGS_BY_ROLE = {
  user:    '¡Hola! ¿En qué te puedo ayudar?',
  empresa: '¡Hola! ¿En qué te puedo ayudar?',
  admin:   '¡Hola! ¿En qué te puedo ayudar?',
};

const IDENTITY_BY_ROLE = {
  user:    'Soy Crafty, el asistente virtual de PlayCraft. Estoy aquí para resolver tus dudas sobre la plataforma: juegos, torneos, salas, ELO, amigos y más.',
  empresa: 'Soy Crafty, el asistente de PlayCraft especializado en cuentas empresa. Te ayudo con subir juegos, crear torneos y gestionar tu panel de empresa.',
  admin:   'Soy Crafty, el asistente de administración de PlayCraft. Te ayudo con el panel admin: reportes, sanciones, usuarios y configuración de la plataforma.',
};

function getLocalAnswer(message, role) {
  const n = normalize(message);

  if (FAQ_GREETINGS.some(g => n === g || n.startsWith(g + ' ') || n.startsWith(g + '!'))) {
    return GREETINGS_BY_ROLE[role] || GREETINGS_BY_ROLE.user;
  }
  if (FAQ_IDENTITY.some(q => n.includes(q))) {
    return IDENTITY_BY_ROLE[role] || IDENTITY_BY_ROLE.user;
  }
  if (FAQ_THANKS.some(t => n === t || n.startsWith(t))) {
    return '¡De nada! Estoy aquí si necesitas algo más.';
  }
  if (FAQ_BYE.some(b => n === b || n.startsWith(b))) {
    return '¡Hasta pronto! Vuelve cuando quieras.';
  }

  return null;
}

// ─── Contexto en tiempo real desde la DB ──────────────────────────────────

const RE_GAME_COUNT = /cuantos juego|numero de juego|total de juego|hay juego/;
const RE_GAME_LIST  = /que juego|lista|catalogo|titulo|juegos hay|juegos disponible|juegos tiene|juegos existen/;
const RE_GAME_ANY   = /juego|game|arcade|puzzle|accion|estrategia/;
const RE_TOURN_COUNT = /cuantos torneo|numero de torneo|total de torneo/;
const RE_TOURN_ANY   = /torneo|campeonato|competici|bracket|clasificaci/;
const RE_USERS_ADMIN = /usuario|cuenta|jugador|registrado/;

async function getRealtimeContext(message, role) {
  const n = normalize(message);
  const parts = [];
  const queries = [];

  // ── Juegos ──
  if (RE_GAME_ANY.test(n) || RE_GAME_COUNT.test(n) || RE_GAME_LIST.test(n)) {
    const wantsList = RE_GAME_LIST.test(n);

    if (wantsList) {
      // Necesita títulos: top 20 por popularidad
      queries.push(
        prisma.game.findMany({
          where: { is_active: true },
          select: { title: true, category: true },
          orderBy: { plays_count: 'desc' },
          take: 20,
        }).then(games => {
          const byCategory = {};
          for (const g of games) {
            (byCategory[g.category] ??= []).push(g.title);
          }
          const total = games.length;
          const lines = Object.entries(byCategory)
            .map(([cat, titles]) => `${cat}: ${titles.join(', ')}`)
            .join('\n');
          parts.push(`Juegos (${total} listados):\n${lines}`);
        })
      );
    } else {
      // Solo necesita conteo: groupBy es mucho más ligero
      queries.push(
        prisma.game.groupBy({
          by: ['category'],
          where: { is_active: true },
          _count: { id: true },
        }).then(rows => {
          const total = rows.reduce((s, r) => s + r._count.id, 0);
          const breakdown = rows.map(r => `${r.category}: ${r._count.id}`).join(', ');
          parts.push(`Juegos: ${total} activos (${breakdown})`);
        })
      );
    }
  }

  // ── Torneos ──
  if (RE_TOURN_ANY.test(n)) {
    const wantsCount = RE_TOURN_COUNT.test(n);

    if (wantsCount) {
      queries.push(
        prisma.tournament.count({ where: { is_active: true, status: { in: ['upcoming', 'active'] } } })
          .then(count => parts.push(`Torneos activos/próximos: ${count}`))
      );
    } else {
      queries.push(
        prisma.tournament.findMany({
          where: { is_active: true, status: { in: ['upcoming', 'active'] } },
          select: { title: true, status: true, max_participants: true, start_date: true, prize: true },
          orderBy: { start_date: 'asc' },
          take: 8,
        }).then(ts => {
          if (ts.length === 0) {
            parts.push('Torneos: ninguno activo o próximo.');
          } else {
            const list = ts.map(t => {
              const date = new Date(t.start_date).toLocaleDateString('es-ES');
              const spots = t.max_participants ? `máx ${t.max_participants}` : '∞';
              const prize = t.prize ? ` | premio: ${t.prize}` : '';
              return `${t.title} (${t.status}, ${date}, ${spots}${prize})`;
            }).join('\n');
            parts.push(`Torneos:\n${list}`);
          }
        })
      );
    }
  }

  // ── Admin: usuarios ──
  if (role === 'admin' && RE_USERS_ADMIN.test(n)) {
    queries.push(
      Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { is_banned: true } }),
      ]).then(([total, banned]) => parts.push(`Usuarios: ${total} registrados, ${banned} baneados.`))
    );
  }

  if (queries.length > 0) await Promise.all(queries);
  return parts.join('\n');
}

// ─── POST /api/assistant/chat ─────────────────────────────────────────────

router.post('/chat', requireAuth, async (req, res) => {
  const { message, history = [] } = req.body;
  const role = req.user.role || 'user';

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Mensaje vacío' });
  }
  if (message.trim().length > 500) {
    return res.status(400).json({ error: 'Mensaje demasiado largo (máx 500 caracteres)' });
  }

  // Capa 1: respuesta local
  const localAnswer = getLocalAnswer(message.trim(), role);
  if (localAnswer) {
    return res.json({ reply: localAnswer, source: 'local' });
  }

  // Capa 2: Groq
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ error: 'Asistente no configurado' });
  }

  const systemPrompt = SYSTEM_PROMPTS[role] || SYSTEM_PROMPTS.user;

  const recentHistory = history.slice(-6).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content).slice(0, 300),
  }));

  // Inyectar datos reales si la pregunta los requiere
  const contextData = await getRealtimeContext(message.trim(), role).catch(() => '');

  const groqMessages = [{ role: 'system', content: systemPrompt }];
  if (contextData) {
    groqMessages.push({
      role: 'system',
      content: `Datos actuales de la plataforma (úsalos para responder con precisión):\n${contextData}`,
    });
  }
  groqMessages.push(...recentHistory);
  groqMessages.push({ role: 'user', content: message.trim() });

  try {
    const groqRes = await fetchCompat(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: 400,
        temperature: 0.5,
      }),
      timeoutMs: 15000,
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error('[assistant] Groq HTTP error:', groqRes.status, errBody);
      return res.status(502).json({ error: 'Error al contactar con el asistente. Inténtalo de nuevo.' });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || 'No pude generar una respuesta.';
    return res.json({ reply, source: 'groq' });
  } catch (err) {
    console.error('[assistant] Groq fetch error:', err.message);
    return res.status(502).json({ error: 'Error al contactar con el asistente. Inténtalo de nuevo.' });
  }
});

export default router;
