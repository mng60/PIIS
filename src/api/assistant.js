import { api } from './client';

export function chatWithCrafty(message, history = []) {
  return api.post('/assistant/chat', { message, history });
}
