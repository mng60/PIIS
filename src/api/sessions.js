import { api } from './client';

export const createSession = (roomCode, gameId) =>
  api.post('/sessions', { room_code: roomCode, game_id: gameId, game_state: { moves: [] }, current_turn: 'host' });

export const getSession    = (code)       => api.get(`/sessions/${code}`);
export const updateSession = (code, data) => api.patch(`/sessions/${code}`, data);
