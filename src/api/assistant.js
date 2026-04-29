import { request } from './client.js';

export function chatWithCrafty(message, history = []) {
  return request('/assistant/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
}
