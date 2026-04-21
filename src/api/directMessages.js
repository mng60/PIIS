import { api } from './client';

export const getDirectMessages = (email) => api.get(`/dm/${encodeURIComponent(email)}`);
export const sendDirectMessage = (email, message) => api.post(`/dm/${encodeURIComponent(email)}`, { message });
export const markMessagesRead = (email) => api.patch(`/dm/read/${encodeURIComponent(email)}`);
export const getUnreadCounts = () => api.get('/dm/unread');
export const sendHeartbeat = () => api.post('/users/heartbeat');
export const setOffline = () => api.post('/users/offline');
