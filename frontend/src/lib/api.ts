import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage if present
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('internalx_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const loginUser = async (email: string, password: string) => {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
};

export const verifyOtp = async (email: string, otp: string) => {
  const res = await api.post('/auth/verify-otp', { email, otp });
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
  const res = await api.get('/users');
  return res.data;
};

export const createUser = async (data: any) => {
  const res = await api.post('/users', data);
  return res.data;
};

export const updateUser = async (id: number, data: any) => {
  const res = await api.put(`/users/${id}`, data);
  return res.data;
};

export const deleteUser = async (id: number) => {
  const res = await api.delete(`/users/${id}`);
  return res.data;
};

export const getUserDetails = async (id: number) => {
  const res = await api.get(`/users/${id}`);
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

export const sendChatMessage = async (data: { content: string, ventureId?: string | number, receiverId?: number }) => {
  const res = await api.post('/chat/messages', data);
  return res.data;
};

// Analytics
export const getAnalytics = async () => {
  const res = await api.get('/analytics');
  return res.data;
};

// Audit
export const getAuditLogs = async () => {
  const res = await api.get('/audit');
  return res.data;
};

// Access Control
export const getAccessLevels = async () => {
  const res = await api.get('/access-control');
  return res.data;
};

export const updateLevelPermissions = async (level: number, permissions: Record<string, boolean>) => {
  const res = await api.put(`/access-control/${level}`, { permissions });
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

