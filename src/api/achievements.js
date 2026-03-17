import { api } from './client';

export const getAchievementDefinitions = (query = '') => api.get(`/achievements/definitions${query}`);
export const createAchievementDefinition = (data) => api.post('/achievements/definitions', data);
export const updateAchievementDefinition = (id, data) => api.patch(`/achievements/definitions/${id}`, data);
export const deleteAchievementDefinition = (id) => api.delete(`/achievements/definitions/${id}`);
export const getUserAchievements = () => api.get('/achievements/user');
export const upsertUserAchievement = (data) => api.post('/achievements/user', data);
