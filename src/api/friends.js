import { api } from './client';

export const getFriends = () => api.get('/friends');
export const getFriendRequests = () => api.get('/friends/requests');
export const getBlockedUsers = () => api.get('/friends/blocked');
export const getFriendStatus = (email) => api.get(`/friends/status/${encodeURIComponent(email)}`);

export const sendFriendRequest = (target_email) => api.post('/friends/request', { target_email });
export const acceptFriendRequest = (id) => api.patch(`/friends/request/${id}/accept`);
export const rejectFriendRequest = (id) => api.patch(`/friends/request/${id}/reject`);
export const removeFriend = (email) => api.delete(`/friends/${encodeURIComponent(email)}`);

export const blockUser = (target_email) => api.post('/friends/block', { target_email });
export const unblockUser = (email) => api.delete(`/friends/block/${encodeURIComponent(email)}`);
