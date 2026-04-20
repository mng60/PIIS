import { api } from './client';

export const getTournaments       = (query = '')  => api.get(`/tournaments${query}`);
export const getTournament        = (id)           => api.get(`/tournaments/${id}`);
export const getParticipants      = (id)           => api.get(`/tournaments/${id}/participants`);
export const getMatches           = (id)           => api.get(`/tournaments/${id}/matches`);
export const createTournament     = (data)         => api.post('/tournaments', data);
export const updateTournament     = (id, data)     => api.patch(`/tournaments/${id}`, data);
export const deleteTournament     = (id)           => api.delete(`/tournaments/${id}`);
export const joinTournament       = (id)           => api.post(`/tournaments/${id}/join`);
export const leaveTournament      = (id)           => api.delete(`/tournaments/${id}/join`);
export const activateTournament   = (id)           => api.post(`/tournaments/${id}/activate`);
export const getMyActiveMatch     = ()             => api.get('/tournaments/my-active-match');
export const checkinMatch         = (room_code)    => api.post('/tournaments/matches/checkin', { room_code });
