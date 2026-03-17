import { api } from './client';

export const getGameById    = (id)          => api.get(`/games/${id}`);
export const getGames       = (query = '')  => api.get(`/games${query}`);
export const recordPlay     = (id)          => api.post(`/games/${id}/play`);
export const createGame     = (data)        => api.post('/games', data);
export const updateGame     = (id, data)    => api.patch(`/games/${id}`, data);
export const deleteGame     = (id)          => api.delete(`/games/${id}`);
