import { api } from './client';

export const getReports = () => api.get('/reports');
export const createReport = (data) => api.post('/reports', data);
export const updateReport = (id, data) => api.patch(`/reports/${id}`, data);
