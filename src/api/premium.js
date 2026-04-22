import { api } from './client';

export const getPremiumStatus = () => api.get('/premium/status');
export const subscribePremium = () => api.post('/premium/subscribe');
export const cancelPremium = () => api.post('/premium/cancel');
