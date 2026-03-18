import { api } from './client';

export const createPasswordResetTicket = (identifier) =>
  api.post('/tickets/password-reset', { identifier });

export const getTickets = (status) =>
  api.get(`/tickets${status ? `?status=${status}` : ''}`);

export const resolveTicket = (id) =>
  api.patch(`/tickets/${id}/resolve`, {});
