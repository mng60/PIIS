import { api } from './client';

export const searchUsers = (q) => api.get(`/profiles/search?q=${encodeURIComponent(q)}`);
export const getPublicProfile = (email) => api.get(`/profiles/${encodeURIComponent(email)}`);
