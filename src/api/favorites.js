import { api } from './client';

export const getFavorites   = ()       => api.get('/favorites');
export const addFavorite    = (gameId) => api.post('/favorites', { game_id: gameId });
export const removeFavorite = (gameId) => api.delete(`/favorites/${gameId}`);
