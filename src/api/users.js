import { api } from './client';

export const getUsers = () => api.get('/users');
export const updateUser = (id, data) => api.patch(`/users/${id}`, data);
export const updateMe = (data) => api.patch('/users/me', data);
