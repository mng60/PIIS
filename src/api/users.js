import { api } from './client';

export const getUsers = () => api.get('/users');
export const updateUser = (id, data) => api.patch(`/users/${id}`, data);
export const updateMe = (data) => api.patch('/users/me', data);
export const changePassword = (current_password, new_password) =>
  api.patch('/auth/change-password', { current_password, new_password });
export const adminResetPassword = (userId, new_password) =>
  api.patch(`/users/${userId}/reset-password`, { new_password });
