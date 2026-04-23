import { api } from './client';

// opts: { minPlayers?, maxPlayers?, initialTurn? }
export const createSession = (roomCode, gameId, initialState = {}, gameMode = 'normal', opts = {}) =>
  api.post('/sessions', {
    room_code: roomCode,
    game_id: gameId,
    game_state: initialState,
    current_turn: opts.initialTurn ?? 'host',
    game_mode: gameMode,
    min_players: opts.minPlayers ?? 2,
    max_players: opts.maxPlayers ?? 2,
  });

export const getSession    = (code)       => api.get(`/sessions/${code}`);
export const updateSession = (code, data) => api.patch(`/sessions/${code}`, data);
export const deleteSession = (code)       => api.delete(`/sessions/${code}`);

// Join a room as a new player (N-player aware, handles capacity server-side)
export const joinSession = (code) => api.post(`/sessions/${code}/join`, {});

// Multi-player player list (GameSessionPlayer)
export const getSessionPlayers    = (code)         => api.get(`/sessions/${code}/players`);
export const addSessionPlayer     = (code, data)   => api.post(`/sessions/${code}/players`, data);
export const updateMyPlayerStatus = (code, status) => api.patch(`/sessions/${code}/players/me`, { status });
