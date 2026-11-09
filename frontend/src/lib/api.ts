import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://internalx.dropwinggroups.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * The session token is never held in JS at all.
 *
 * The backend sets it as an `httpOnly` cookie on login (see
 * `generateAuthResponse` in auth.controller.js) — the browser attaches it to
 * every request automatically because of `withCredentials: true` above,
 * and `authenticate()` on the server checks that cookie first. There is
 * nothing for a request interceptor to do here, and there never needs to be:
 * an `httpOnly` cookie cannot be read by JavaScript, which is the entire
 * point — a script injected by an XSS bug cannot exfiltrate it. Reading it
 * from `localStorage` or a JS-writable cookie into a header, as this used
 * to do, would recreate exactly the exposure the `httpOnly` flag exists to
 * close.
 */

// Response interceptor — an expired or revoked session sends the user back
// to sign in. There's no client-side token to clear: the server already
// cleared the cookie on logout, and a 401 here just means whatever cookie
// the browser sent was rejected.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const loginUser = async (email: string, password: string) => {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
};

export const googleLogin = async (credential: string) => {
  const res = await api.post('/auth/google-login', { credential });
  return res.data;
};

export const verifyOtp = async (email: string, otp: string) => {
  const res = await api.post('/auth/verify-otp', { email, otp });
  return res.data;
};

export const register = async (fullName: string, email: string, password: string) => {
  const res = await api.post('/auth/register', { fullName, email, password });
  return res.data;
};

export const forgotPassword = async (email: string) => {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data;
};

export const resetPassword = async (token: string, newPassword: string) => {
  const res = await api.post('/auth/reset-password', { token, newPassword });
  return res.data;
};

export const logoutUser = async () => {
  const res = await api.post('/auth/logout');
  return res.data;
};

export const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

// Users
export const getUsers = async () => {
  const res = await api.get('/team-members');
  return res.data;
};

export const createUser = async (data: any) => {
  const res = await api.post('/team-members', data);
  return res.data;
};

export const updateUser = async (id: number, data: any) => {
  const res = await api.put(`/team-members/${id}`, data);
  return res.data;
};

export const deleteUser = async (id: number) => {
  const res = await api.delete(`/team-members/${id}`);
  return res.data;
};

export const getUserDetails = async (id: number) => {
  const res = await api.get(`/team-members/${id}`);
  return res.data;
};

// Tasks
export const getTasks = async () => {
  const res = await api.get('/tasks');
  return res.data;
};

export const createTask = async (data: any) => {
  const res = await api.post('/tasks', data);
  return res.data;
};

export const updateTask = async (id: number, data: any) => {
  const res = await api.put(`/tasks/${id}`, data);
  return res.data;
};

export const deleteTask = async (id: number) => {
  const res = await api.delete(`/tasks/${id}`);
  return res.data;
};

// Projects
export const getProjects = () => api.get('/projects').then(res => res.data);
export const getProject = (id: number) => api.get(`/projects/${id}`).then(res => res.data);
export const createProject = (data: any) => api.post('/projects', data).then(res => res.data);

export const updateProject = async (id: number, data: any) => {
  const res = await api.put(`/projects/${id}`, data);
  return res.data;
};

export const deleteProject = async (id: number) => {
  const res = await api.delete(`/projects/${id}`);
  return res.data;
};

// Chat
export const getChatMessages = async (params: { ventureId?: string | number, receiverId?: number }) => {
  const query = new URLSearchParams(params as any).toString();
  const res = await api.get(`/chat/messages?${query}`);
  return res.data;
};

export interface ChatChannels { global: boolean; ventures: { id: number; name: string; slug: string; color: string }[]; }
export const getChatChannels = async (): Promise<{ success: boolean; data: ChatChannels }> => {
  const res = await api.get('/chat/channels');
  return res.data;
};

export const sendChatMessage = async (data: { content: string, ventureId?: string | number, receiverId?: number }) => {
  const res = await api.post('/chat/messages', data);
  return res.data;
};

// Analytics
export const getAnalytics = async (days?: number) => {
  const query = days ? `?days=${days}` : '';
  const res = await api.get(`/platform-metrics${query}`);
  return res.data;
};

// Audit
export const getAuditLogs = async () => {
  const res = await api.get('/action-logs');
  return res.data;
};

// Notifications
export const getNotifications = async () => {
  const res = await api.get('/notifications');
  return res.data;
};

export const markNotificationRead = async (id: number) => {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await api.patch('/notifications/read-all');
  return res.data;
};

export const clearReadNotifications = async () => {
  const res = await api.delete('/notifications/clear');
  return res.data;
};


// Learning Hub
export const getLearningChecklist = async () => {
  const res = await api.get('/learning/checklist');
  return res.data;
};

export const createChecklistItem = async (data: any) => {
  const res = await api.post('/learning/checklist', data);
  return res.data;
};

export const deleteChecklistItem = async (id: number) => {
  const res = await api.delete(`/learning/checklist/${id}`);
  return res.data;
};

export const updateInternProgress = async (checklistItemId: number, completed: boolean) => {
  const res = await api.patch(`/learning/progress/${checklistItemId}`, { completed });
  return res.data;
};

export const getInternProgressSummaries = async () => {
  const res = await api.get('/learning/progress');
  return res.data;
};

export const getLearningResources = async () => {
  const res = await api.get('/learning/resources');
  return res.data;
};

export const createLearningResource = async (data: any) => {
  const res = await api.post('/learning/resources', data);
  return res.data;
};

export const deleteLearningResource = async (id: number) => {
  const res = await api.delete(`/learning/resources/${id}`);
  return res.data;
};

export const getLearningFeedback = async () => {
  const res = await api.get('/learning/feedback');
  return res.data;
};

export const createLearningFeedback = async (data: any) => {
  const res = await api.post('/learning/feedback', data);
  return res.data;
};

export const deleteLearningFeedback = async (id: number) => {
  const res = await api.delete(`/learning/feedback/${id}`);
  return res.data;
};

// Strategy
export const getStrategyData = async () => {
  const res = await api.get('/strategy');
  return res.data;
};

export default api;

