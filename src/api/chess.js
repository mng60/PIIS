import { api } from './client';

export const createChessRoom = (data) => api.post('/chess', data);
export const getChessRoom = (roomCode) => api.get(`/chess/${roomCode}`);
export const updateChessRoom = (roomCode, data) => api.patch(`/chess/${roomCode}`, data);
export const deleteChessRoom = (roomCode) => api.delete(`/chess/${roomCode}`);
export const getMyActiveChessGames = () => api.get('/chess/my-active-games');

export const requestAiMove = (roomCode, moves) =>
  api.post('/coach/ai-move', { room_code: roomCode, moves, player_color: 'white' });

export const requestGameSummary = (roomCode, moves, result) =>
  api.post('/coach/game-summary', { room_code: roomCode, moves, result });
