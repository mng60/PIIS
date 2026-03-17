import { api } from './client';

export const getTournaments = (query = '') => api.get(`/tournaments${query}`);
export const createTournament = (data) => api.post('/tournaments', data);
export const updateTournament = (id, data) => api.patch(`/tournaments/${id}`, data);
export const deleteTournament = (id) => api.delete(`/tournaments/${id}`);
