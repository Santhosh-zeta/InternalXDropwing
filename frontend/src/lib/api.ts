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

export const sendChatMessage = async (data: { content: string, ventureId?: string | number, receiverId?: number }) => {
  const res = await api.post('/chat/messages', data);
  return res.data;
};

// Analytics
export const getAnalytics = async () => {
  const res = await api.get('/platform-metrics');
  return res.data;
};

// Audit
export const getAuditLogs = async () => {
  const res = await api.get('/action-logs');
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

export const get2FAConfig = async () => {
  const res = await api.get('/access-control/2fa-config');
  return res.data;
};

export const update2FAConfig = async (enable2FA: boolean) => {
  const res = await api.put('/access-control/2fa-config', { enable2FA });
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

// ── Role Management ──────────────────────────────────────────────────────────
export const getRoles = async () => {
  const res = await api.get('/role-management');
  return res.data;
};

export const getRoleVentures = async () => {
  const res = await api.get('/role-management/ventures');
  return res.data;
};

export const getRoleById = async (id: number) => {
  const res = await api.get(`/role-management/${id}`);
  return res.data;
};

export const getRoleAssignableUsers = async () => {
  const res = await api.get('/role-management/assign-team-members');
  return res.data;
};

export const createRole = async (data: {
  role_name: string;
  role_key: string;
  description?: string;
  color?: string;
  icon?: string;
  base_level?: number;
  permissions?: Record<string, boolean>;
  venture_id?: number | null;
  sort_order?: number;
}) => {
  const res = await api.post('/role-management', data);
  return res.data;
};

export const updateRole = async (id: number, data: Partial<{
  role_name: string;
  role_key: string;
  description: string;
  color: string;
  icon: string;
  base_level: number;
  permissions: Record<string, boolean>;
  sort_order: number;
}>) => {
  const res = await api.put(`/role-management/${id}`, data);
  return res.data;
};

export const deleteRole = async (id: number) => {
  const res = await api.delete(`/role-management/${id}`);
  return res.data;
};

export const duplicateRole = async (id: number) => {
  const res = await api.post(`/role-management/${id}/duplicate`);
  return res.data;
};

export const assignRoleToUser = async (user_id: number, role_id: number) => {
  const res = await api.post('/role-management/assign', { user_id, role_id });
  return res.data;
};

export const removeRoleFromUser = async (user_id: number, role_id: number) => {
  const res = await api.delete('/role-management/assign', { data: { user_id, role_id } });
  return res.data;
};

export default api;

