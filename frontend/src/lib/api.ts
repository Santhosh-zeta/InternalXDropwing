import axios, { isAxiosError } from 'axios';
import type { User } from './constants';
import type { Analytics, AppNotification, AuditLog, ChatMessage, Envelope, EnvelopeWith, Payload, Project, Task, TeamMember, UserTaskActivity, Venture } from './types';

/**
 * Origin of the API. Empty (same origin) in production, where the backend serves
 * this app. For `next dev` on :3000 set NEXT_PUBLIC_API_URL=http://localhost:5000
 * in frontend/.env.local (see .env.example).
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

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

// The client defaults to JSON. A FormData body (uploads) must go out without a fixed Content-Type so the
// browser can add the multipart boundary; with the JSON default the server receives no file at all.
api.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) config.headers.delete('Content-Type');
  return config;
});

// Response interceptor — an expired or revoked session sends the user back
// to sign in. There's no client-side token to clear: the server already
// cleared the cookie on logout, and a 401 here just means whatever cookie
// the browser sent was rejected.
const redirectToLogin = () => {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/login')) return;
  // A full page load on purpose: it drops every piece of in-memory session state.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = '/login';
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) redirectToLogin();
    return Promise.reject(error);
  }
);


/** Best human-readable message for a failed request. */
export const errMsg = (error: unknown, fallback = 'Something went wrong'): string => {
  if (isAxiosError(error)) {
    const msg = (error.response?.data as { message?: string } | undefined)?.message;
    if (msg) return msg;
    if (!error.response) return 'Cannot reach the server. Check your connection.';
  } else if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

/** True when a request was cancelled on purpose (unmount, new request). */
export const isAborted = (error: unknown): boolean => isAxiosError(error) && error.code === 'ERR_CANCELED';

const unwrap = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const apiGet = <T>(url: string, signal?: AbortSignal, params?: Record<string, string | number | boolean | undefined>) =>
  unwrap<T>(api.get(url, { signal, params }));

// Auth
/** Login-type responses: `data` is absent while a one-time code is still required. */
export type AuthResponse = Omit<Envelope<{ token?: string; user: { fullName: string } }>, 'data'> & {
  data?: { token?: string; user: { fullName: string } };
  requiresOTP?: boolean;
};

export const loginUser = (email: string, password: string) => unwrap<AuthResponse>(api.post('/auth/login', { email, password }));
export const googleLogin = (credential: string) => unwrap<AuthResponse>(api.post('/auth/google-login', { credential }));
export const verifyOtp = (email: string, otp: string) => unwrap<AuthResponse>(api.post('/auth/verify-otp', { email, otp }));
export const register = (fullName: string, email: string, password: string) =>
  unwrap<AuthResponse>(api.post('/auth/register', { fullName, email, password }));

export const getAuthConfig = async (): Promise<{ selfRegistration: boolean; googleLogin: boolean; googleClientId?: string | null }> => {
  const res = await api.get('/auth/config');
  return res.data.data;
};

export const forgotPassword = (email: string) => unwrap<Envelope<unknown>>(api.post('/auth/forgot-password', { email }));
export const resetPassword = (token: string, newPassword: string) =>
  unwrap<Envelope<unknown>>(api.post('/auth/reset-password', { token, newPassword }));
export const logoutUser = () => unwrap<Envelope<unknown>>(api.post('/auth/logout'));
export const getMe = () => unwrap<Envelope<User>>(api.get('/auth/me'));

// Users
export const getUsers = (signal?: AbortSignal) => apiGet<Envelope<TeamMember[]>>('/team-members', signal);
export const getPendingUsers = (signal?: AbortSignal) => apiGet<Envelope<TeamMember[]>>('/team-members', signal, { pending: 'true' });
export const getVentures = (signal?: AbortSignal) => apiGet<Envelope<Venture[]>>('/team-members/ventures', signal);
export const createUser = (data: Payload) => unwrap<InviteResponse & { userId: number }>(api.post('/team-members', data));
export const updateUser = (id: number, data: Payload) => unwrap<Envelope<TeamMember>>(api.put(`/team-members/${id}`, data));
export const deleteUser = (id: number) => unwrap<Envelope<null>>(api.delete(`/team-members/${id}`));
export const getUserDetails = (id: number) =>
  unwrap<Envelope<{ user: TeamMember; activity: UserTaskActivity[] }>>(api.get(`/team-members/${id}`));
/** Invite outcome: `link` is present only when email is not configured (share it yourself). */
export interface InviteResponse { success: boolean; message?: string; invite: { emailed: boolean; expiresAt?: string; link?: string } }
export const resendInvite = (id: number) => unwrap<InviteResponse>(api.post(`/team-members/${id}/invite`));
export const getUserRate = (id: number, signal?: AbortSignal) => apiGet<Envelope<{ user_id: number; hourly_rate: number | null }>>(`/team-members/${id}/rate`, signal);
export const setUserRate = (id: number, hourlyRate: number | null) =>
  unwrap<Envelope<{ user_id: number; hourly_rate: number | null }>>(api.put(`/team-members/${id}/rate`, { hourly_rate: hourlyRate }));

// Tasks
export const getTasks = (signal?: AbortSignal) => apiGet<Envelope<Task[]>>('/tasks', signal);
export const createTask = (data: Payload) => unwrap<Envelope<Task>>(api.post('/tasks', data));
export const updateTask = (id: number, data: Payload) => unwrap<Envelope<Task>>(api.put(`/tasks/${id}`, data));
export const deleteTask = (id: number) => unwrap<Envelope<null>>(api.delete(`/tasks/${id}`));

// Projects
export const getProjects = (signal?: AbortSignal) => apiGet<Envelope<Project[]>>('/projects', signal);
export const getProject = (id: number) => unwrap<Envelope<Project>>(api.get(`/projects/${id}`));
export const createProject = (data: Payload) => unwrap<Envelope<Project>>(api.post('/projects', data));
export const updateProject = (id: number, data: Payload) => unwrap<Envelope<Project>>(api.put(`/projects/${id}`, data));
export const deleteProject = (id: number) => unwrap<Envelope<null>>(api.delete(`/projects/${id}`));

// Chat
export const getChatMessages = (params: { ventureId?: string | number; receiverId?: number }) =>
  unwrap<Envelope<ChatMessage[]>>(api.get('/chat/messages', { params }));

export interface ChatChannels { global: boolean; ventures: { id: number; name: string; slug: string; color: string }[] }
export const getChatChannels = (): Promise<{ success: boolean; data: ChatChannels }> => unwrap(api.get('/chat/channels'));

export const sendChatMessage = (data: { content: string; ventureId?: string | number; receiverId?: number }) =>
  unwrap<Envelope<ChatMessage>>(api.post('/chat/messages', data));

// Analytics
export const getAnalytics = (days?: number, signal?: AbortSignal) => apiGet<Envelope<Analytics>>('/platform-metrics', signal, { days });

// Audit
export const getAuditLogs = (signal?: AbortSignal) => apiGet<Envelope<AuditLog[]>>('/action-logs', signal);

// Notifications
export const getNotifications = (signal?: AbortSignal) =>
  apiGet<EnvelopeWith<AppNotification[], { unreadCount?: number }>>('/notifications', signal);
export const markNotificationRead = (id: number) => unwrap<Envelope<null>>(api.patch(`/notifications/${id}/read`));
export const markAllNotificationsRead = () => unwrap<Envelope<null>>(api.patch('/notifications/read-all'));
export const clearReadNotifications = () => unwrap<Envelope<null>>(api.delete('/notifications/clear'));

export interface NotificationPrefs { digest: boolean; alerts: boolean; email: boolean; digestAvailable?: boolean; alertsAvailable?: boolean }
export const getNotificationPrefs = (signal?: AbortSignal) => apiGet<Envelope<NotificationPrefs>>('/notifications/preferences', signal);
export const setNotificationPrefs = (prefs: Partial<Pick<NotificationPrefs, 'digest' | 'alerts' | 'email'>>) =>
  unwrap<Envelope<NotificationPrefs>>(api.put('/notifications/preferences', prefs));

// Documents
export const setDocumentClientVisible = (id: number, clientVisible: boolean) =>
  unwrap<Envelope<unknown>>(api.patch(`/documents/${id}/client-visible`, { clientVisible }));

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
    if (res.status === 401) redirectToLogin();
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

