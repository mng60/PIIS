import { api } from './client';

export const getGameScores  = (gameId, limit = 10)    => api.get(`/scores?game_id=${gameId}&limit=${limit}`);
export const getUserScores  = (email, limit = 50)      => api.get(`/scores?user_email=${email}&limit=${limit}`);
export const getUserGameScores = (email, gameId, limit = 1000) => api.get(`/scores?user_email=${email}&game_id=${gameId}&limit=${limit}`);
export const submitScore       = (gameId, score, timePlayed = 0) => api.post('/scores', { game_id: gameId, score, time_played: timePlayed });
export const recordGamePlay    = (gameId, timePlayed = 0)        => api.post('/scores', { game_id: gameId, time_played: timePlayed, minimal: true });
