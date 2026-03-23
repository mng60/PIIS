// ── Configuración del sistema de gamificación ─────────────────────────────
// Este fichero es la fuente de verdad para niveles y rareza de logros.
// El compañero encargado del diseño puede editar nombres y colores aquí.

export const LEVELS = [
  { level: 1, name: "Novato",   xpRequired: 0,      color: "#9ca3af" },
  { level: 2, name: "Casual",   xpRequired: 200,    color: "#22d3ee" },
  { level: 3, name: "Veterano", xpRequired: 1000,   color: "#a855f7" },
  { level: 4, name: "Maestro",  xpRequired: 4000,   color: "#f59e0b" },
  { level: 5, name: "Leyenda",  xpRequired: 12000,  color: "#f43f5e" },
];

export const RARITY_CONFIG = {
  bronze: { label: "Bronce", xp: 25,  color: "#cd7f32" },
  silver: { label: "Plata",  xp: 75,  color: "#9ca3af" },
  gold:   { label: "Oro",    xp: 200, color: "#f59e0b" },
};

// ── Helpers ───────────────────────────────────────────────────────────────

/** Devuelve el nivel actual del usuario según sus XP. */
export function getLevelFromXP(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl;
  }
  return current;
}

/** Devuelve el siguiente nivel (null si ya es Leyenda). */
export function getNextLevel(xp) {
  const current = getLevelFromXP(xp);
  return LEVELS.find(l => l.level === current.level + 1) ?? null;
}

/** Progreso (0-1) dentro del nivel actual. */
export function getLevelProgress(xp) {
  const current = getLevelFromXP(xp);
  const next    = getNextLevel(xp);
  if (!next) return 1;
  return (xp - current.xpRequired) / (next.xpRequired - current.xpRequired);
}
