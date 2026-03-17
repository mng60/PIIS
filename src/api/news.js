import { api } from './client';

export const getNews = () => api.get('/news');
