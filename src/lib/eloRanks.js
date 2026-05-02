/**
 * Rangos ELO basados en el sistema USCF/FIDE combinado.
 * Aplicable a cualquier juego con sistema ELO.
 */
const ELO_RANKS = [
  { min: 2500, label: "Gran Maestro",            short: "GM",  color: "#f59e0b" },
  { min: 2400, label: "Maestro Internacional",   short: "MI",  color: "#f59e0b" },
  { min: 2300, label: "Maestro FIDE",            short: "MF",  color: "#eab308" },
  { min: 2200, label: "Candidato a Maestro",     short: "CM",  color: "#84cc16" },
  { min: 2000, label: "Experto",                 short: "EXP", color: "#22c55e" },
  { min: 1800, label: "Clase A",                 short: "A",   color: "#06b6d4" },
  { min: 1600, label: "Clase B",                 short: "B",   color: "#3b82f6" },
  { min: 1400, label: "Clase C",                 short: "C",   color: "#8b5cf6" },
  { min: 1200, label: "Clase D",                 short: "D",   color: "#a78bfa" },
  { min: 1000, label: "Clase E",                 short: "E",   color: "#94a3b8" },
  { min: 0,    label: "Novato",                  short: "NOV", color: "#64748b" },
];

/**
 * Devuelve el rango correspondiente a un rating ELO.
 * @param {number} rating
 * @returns {{ label: string, short: string, color: string, min: number }}
 */
export function getEloRank(rating) {
  return ELO_RANKS.find(r => rating >= r.min) ?? ELO_RANKS[ELO_RANKS.length - 1];
}
