import { api } from './client';

export const createChessRoom = (data) => api.post('/chess', data);
export const getChessRoom = (roomCode) => api.get(`/chess/${roomCode}`);
export const updateChessRoom = (roomCode, data) => api.patch(`/chess/${roomCode}`, data);
export const deleteChessRoom = (roomCode) => api.delete(`/chess/${roomCode}`);
