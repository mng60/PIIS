import { api } from './client';

export const getGameScores  = (gameId, limit = 10)    => api.get(`/scores?game_id=${gameId}&limit=${limit}`);
export const getUserScores  = (email, limit = 50)      => api.get(`/scores?user_email=${email}&limit=${limit}`);
export const submitScore    = (gameId, score)          => api.post('/scores', { game_id: gameId, score });
