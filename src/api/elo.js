import { api } from './client';

/** Aplica ELO genérico — mode: "duel" | "position" */
export const applyElo = (data) => api.post('/elo/apply', data);

/** Atajo para chess (idempotente) */
export const submitChessElo = (roomCode) => api.post(`/elo/chess/${roomCode}`);

/** Leaderboard ELO de un juego */
export const getEloLeaderboard = (gameId) => api.get(`/elo/leaderboard/${gameId}`);

/** ELO del usuario en todos sus juegos multijugador */
export const getUserEloStats = (email) => api.get(`/elo/user/${email}`);
