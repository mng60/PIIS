import { api } from './client';

// initialState defaults to {} — each game defines its own structure
export const createSession = (roomCode, gameId, initialState = {}, maxPlayers = 2) =>
  api.post('/sessions', { room_code: roomCode, game_id: gameId, game_state: initialState, current_turn: 'host', max_players: maxPlayers });

export const getSession    = (code)       => api.get(`/sessions/${code}`);
export const updateSession = (code, data) => api.patch(`/sessions/${code}`, data);
export const deleteSession = (code)       => api.delete(`/sessions/${code}`);
