// ── Configuración del sistema de gamificación ─────────────────────────────
// Este fichero es la fuente de verdad para niveles y rareza de logros.
// El compañero encargado del diseño puede editar nombres y colores aquí.

export const LEVELS = [
  { level: 1, name: "Minero",      xpRequired: 0,      color: "#9ca3af" },
  { level: 2, name: "Jardinero",   xpRequired: 200,    color: "#22d3ee" },
  { level: 3, name: "Piloto",      xpRequired: 1000,   color: "#a855f7" },
  { level: 4, name: "Astronauta",  xpRequired: 4000,   color: "#8b5cf6" },
  { level: 5, name: "Alien",       xpRequired: 12000,  color: "#fbbf24" },
];

export const LEVEL_THEME_COLORS = {
  1: "#c08a48",
  2: "#22c55e",
  3: "#55c9f4",
  4: "#8b5cf6",
  5: "#fbbf24",
};

// Usuarios premium necesitan solo el 70% del XP para subir de nivel
export const PREMIUM_XP_FACTOR = 0.7;

export const RARITY_CONFIG = {
  bronze: { label: "Bronce", xp: 25,  color: "#cd7f32" },
  silver: { label: "Plata",  xp: 75,  color: "#9ca3af" },
  gold:   { label: "Oro",    xp: 200, color: "#f59e0b" },
};

// ── Helpers ───────────────────────────────────────────────────────────────

function scaledLevels(isPremium) {
  if (!isPremium) return LEVELS;
  return LEVELS.map(l => ({ ...l, xpRequired: Math.round(l.xpRequired * PREMIUM_XP_FACTOR) }));
}

/** Devuelve el nivel actual del usuario según sus XP. */
export function getLevelFromXP(xp, isPremium = false) {
  const levels = scaledLevels(isPremium);
  let current = levels[0];
  for (const lvl of levels) {
    if (xp >= lvl.xpRequired) current = lvl;
  }
  return current;
}

/** Devuelve el siguiente nivel (null si ya es Leyenda). */
export function getNextLevel(xp, isPremium = false) {
  const current = getLevelFromXP(xp, isPremium);
  return scaledLevels(isPremium).find(l => l.level === current.level + 1) ?? null;
}

/** Progreso (0-1) dentro del nivel actual. */
export function getLevelProgress(xp, isPremium = false) {
  const current = getLevelFromXP(xp, isPremium);
  const next    = getNextLevel(xp, isPremium);
  if (!next) return 1;
  return (xp - current.xpRequired) / (next.xpRequired - current.xpRequired);
}

export function getLevelThemeColor(level) {
  return LEVEL_THEME_COLORS[level] ?? LEVELS.find((item) => item.level === level)?.color ?? "#22d3ee";
}
