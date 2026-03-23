import { api } from './client';

export const resetGameScores = (game_id) => api.post('/maintenance/reset-scores', { game_id });
export const resetGamePlays  = (game_id) => api.post('/maintenance/reset-plays',  { game_id });
export const resetGameFull   = (game_id) => api.post('/maintenance/reset-game',   { game_id });
export const resetUserScores = (user_email) => api.post('/maintenance/reset-user-scores', { user_email });
export const resetUserXp     = (user_email) => api.post('/maintenance/reset-user-xp',     { user_email });
