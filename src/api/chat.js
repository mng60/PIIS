import { api } from './client';

export const getChatMessages = (gameId, sessionId) =>
  api.get(`/chat?game_id=${gameId}&session_id=${sessionId}`);

export const sendChatMessage = (gameId, sessionId, message) =>
  api.post('/chat', { game_id: gameId, session_id: sessionId, message });

export const deleteChatMessage = (id) => api.delete(`/chat/${id}`);
