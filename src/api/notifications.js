import { api } from './client';

export const getNotifications = () => api.get('/notifications');
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markAsRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllAsRead = () => api.patch('/notifications/read-all');
export const sendGameInvite = (target_email, room_code, game_id, game_title) =>
  api.post('/notifications/game-invite', { target_email, room_code, game_id, game_title });
