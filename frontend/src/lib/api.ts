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

export const getAuthConfig = async (): Promise<{ selfRegistration: boolean; googleLogin: boolean }> => {
  const res = await api.get('/auth/config');
  return res.data.data;
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

// Search (Ctrl/Cmd+K palette) — scoped server-side
export type SearchHitType = 'project' | 'task' | 'document' | 'announcement' | 'user' | 'message';
export interface SearchHit { type: SearchHitType; id: number; title: string; subtitle: string; link: string }

export const searchAll = async (q: string): Promise<SearchHit[]> => {
  const res = await api.get('/search', { params: { q } });
  const groups: Record<string, SearchHit[]> = res.data?.data?.groups || {};
  return Object.values(groups).flat();
};

// Ask InternalX (assistant)
export interface AssistantStatus {
  configured: boolean;
  setupHint: string | null;
  suggestions: string[];
  limits: { dailyMessages: number; dailyTokens: number };
}
export interface AssistantConversation { id: number; title: string; updated_at: string }
export interface AssistantStoredMessage { id: number; role: 'user' | 'assistant'; text: string; tools: string[]; created_at: string }
export type AssistantEvent =
  | { type: 'conversation'; id: number; title: string }
  | { type: 'text'; delta: string }
  | { type: 'tool'; id: string; name: string; label: string; state: 'running' | 'done' | 'error' }
  | { type: 'notice'; message: string }
  | { type: 'error'; message: string }
  | { type: 'done'; usage: { input_tokens: number; output_tokens: number }; stop_reason: string | null };

export const getAssistantStatus = async (): Promise<AssistantStatus> => (await api.get('/assistant/status')).data.data;
export const getAssistantConversations = async (): Promise<AssistantConversation[]> => (await api.get('/assistant/conversations')).data.data;
export const getAssistantConversation = async (id: number): Promise<AssistantConversation & { messages: AssistantStoredMessage[] }> =>
  (await api.get(`/assistant/conversations/${id}`)).data.data;
export const deleteAssistantConversation = async (id: number) => (await api.delete(`/assistant/conversations/${id}`)).data;

/**
 * POST /assistant/chat answers with Server-Sent Events. axios cannot stream in the
 * browser, so this uses fetch with the same cookie credentials. Resolves when the
 * stream ends; throws an Error (with `.code`) when the request is refused up front.
 */
export const streamAssistantChat = async (
  body: { message: string; conversationId?: number | null },
  onEvent: (e: AssistantEvent) => void,
  signal?: AbortSignal,
): Promise<void> => {
  const res = await fetch(`${api.defaults.baseURL}/assistant/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    let info: { message?: string; code?: string } = {};
    try { info = await res.json(); } catch { /* not JSON */ }
    if (res.status === 401 && typeof window !== 'undefined') window.location.href = '/login';
    throw Object.assign(new Error(info.message || 'The assistant is unavailable right now.'), { code: info.code });
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut = buffer.indexOf('\n\n');
    while (cut !== -1) {
      const chunk = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      if (chunk.startsWith('data: ')) {
        try { onEvent(JSON.parse(chunk.slice(6)) as AssistantEvent); } catch { /* ignore a malformed frame */ }
      }
      cut = buffer.indexOf('\n\n');
    }
  }
};

// Meeting notes -> draft tasks (managers). Nothing is created until the second call.
export interface NoteDraft {
  title: string;
  description: string | null;
  assignee: { id: number; name: string } | null;
  assignee_candidates: { id: number; name: string }[];
  project: { id: number; name: string } | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  warnings: string[];
}
export interface NotesProposal {
  drafts: NoteDraft[];
  people: { id: number; name: string }[];
  projects: { id: number; name: string }[];
}
export interface ConfirmedTask {
  title: string;
  assigned_to: number;
  project_id?: number | null;
  due_date?: string | null;
  priority?: string | null;
  description?: string | null;
}
export const proposeTasksFromNotes = async (notes: string): Promise<NotesProposal> =>
  (await api.post('/assistant/notes/propose', { notes })).data.data;
export const createTasksFromNotes = async (tasks: ConfirmedTask[]): Promise<{ created: number; failed: number; results: { index: number; ok: boolean; id?: number; error?: string }[] }> =>
  (await api.post('/assistant/notes/create', { tasks })).data.data;

export default api;

