import { api } from './client';

export const joinQueue    = (game_id, game_mode, elo_rating, time_key) =>
  api.post('/matchmaking/join', { game_id, game_mode, elo_rating, time_key });

export const getMatchStatus = () => api.get('/matchmaking/status');

export const cancelSearch   = () => api.delete('/matchmaking/cancel');
