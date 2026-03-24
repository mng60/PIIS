/**
 * Sistema de medallas de PlayCraft
 *
 * Para añadir una medalla nueva, agrega un objeto al array MEDALS:
 *
 *   id          — identificador único (string, sin espacios)
 *   name        — nombre visible
 *   description — cómo se consigue
 *   icon        — emoji ("🎮")  o  URL/ruta a imagen ("/medals/mi-medalla.png", "https://...")
 *   color       — color del borde y fondo en hex
 *   condition   — función (stats) => boolean
 *
 * Stats disponibles en condition:
 *   totalPlays       — partidas jugadas en total (todos los juegos)
 *   totalWins        — victorias totales
 *   bestScore        — mejor puntuación individual histórica
 *   totalTimePlayed  — tiempo total jugado en segundos
 *   gamesPlayed      — número de juegos distintos jugados
 *   level            — nivel actual (1–5)
 */
export const MEDALS = [
  // ── Partidas jugadas ──────────────────────────────────────────────────
  { id: 'first_play', name: 'Primera partida', description: 'Juega tu primera partida',    icon: '🎮', color: '#9ca3af', condition: s => s.totalPlays >= 1   },
  { id: 'play_25',    name: 'Habitual',         description: '25 partidas jugadas',         icon: '🕹️', color: '#22d3ee', condition: s => s.totalPlays >= 25  },
  { id: 'play_100',   name: 'Adicto',           description: '100 partidas jugadas',        icon: '⚡', color: '#a855f7', condition: s => s.totalPlays >= 100 },

  // ── Victorias ─────────────────────────────────────────────────────────
  { id: 'first_win',  name: 'Primera victoria', description: 'Consigue tu primera victoria', icon: '🏆', color: '#f59e0b', condition: s => s.totalWins >= 1  },
  { id: 'wins_50',    name: 'Imparable',         description: '50 victorias conseguidas',    icon: '⚔️', color: '#f43f5e', condition: s => s.totalWins >= 50 },

  // ── Tiempo jugado ─────────────────────────────────────────────────────
  { id: 'hour_1',  name: 'Maratonista', description: '1 hora de juego en total',   icon: '⏱️', color: '#22d3ee', condition: s => s.totalTimePlayed >= 3600  },
  { id: 'hour_10', name: 'Sin vida',    description: '10 horas de juego en total', icon: '🌙', color: '#a855f7', condition: s => s.totalTimePlayed >= 36000 },

  // ── Exploración ───────────────────────────────────────────────────────
  { id: 'explorer',  name: 'Explorador',    description: 'Prueba 5 juegos distintos',  icon: '🗺️', color: '#22d3ee', condition: s => s.gamesPlayed >= 5  },
  { id: 'collector', name: 'Coleccionista', description: 'Prueba 10 juegos distintos', icon: '📚', color: '#f59e0b', condition: s => s.gamesPlayed >= 10 },

  // ── Niveles de gamificación ───────────────────────────────────────────
  { id: 'level_2', name: 'Casual',   description: 'Alcanza el nivel Casual',   icon: '🌊', color: '#22d3ee', condition: s => s.level >= 2 },
  { id: 'level_3', name: 'Veterano', description: 'Alcanza el nivel Veterano', icon: '💜', color: '#a855f7', condition: s => s.level >= 3 },
  { id: 'level_4', name: 'Maestro',  description: 'Alcanza el nivel Maestro',  icon: '✨', color: '#f59e0b', condition: s => s.level >= 4 },
  { id: 'level_5', name: 'Leyenda',  description: 'Alcanza el nivel Leyenda',  icon: '🔥', color: '#f43f5e', condition: s => s.level >= 5 },
];

/**
 * Devuelve las medallas que ha ganado el usuario según sus stats.
 * @param {{ totalPlays?: number, totalWins?: number, bestScore?: number, totalTimePlayed?: number, gamesPlayed?: number, level?: number }} stats
 * @returns {typeof MEDALS}
 */
export function evaluateMedals(stats) {
  const s = { totalPlays: 0, totalWins: 0, bestScore: 0, totalTimePlayed: 0, gamesPlayed: 0, level: 1, ...stats };
  return MEDALS.filter(m => m.condition(s));
}
