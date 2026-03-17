import { api } from './client';

export const getGameComments = (gameId)           => api.get(`/comments?game_id=${gameId}`);
export const addComment      = (gameId, content, rating) => api.post('/comments', { game_id: gameId, content, rating });
export const deleteComment   = (id)               => api.delete(`/comments/${id}`);
