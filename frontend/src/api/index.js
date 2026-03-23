import api from './client';

// ─── Auth / Profile ────────────────────────────────────────────────────────
export const getMe = () => api.get('/api/users/me');

// ─── Users ────────────────────────────────────────────────────────────────
export const getUsers = () => api.get('/api/users');
export const getUsersByVenture = (ventureId) => api.get(`/api/users/venture/${ventureId}`);
export const getUserById = (id) => api.get(`/api/users/${id}`);
export const createUser = (data) => api.post('/api/users', data);
export const updateUser = (id, data) => api.put(`/api/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/api/users/${id}`);

// ─── Ventures (Companies) ──────────────────────────────────────────────────
export const getVentures = () => api.get('/api/ventures');
export const getVentureById = (id) => api.get(`/api/ventures/${id}`);
export const createVenture = (data) => api.post('/api/ventures', data);
export const updateVenture = (id, data) => api.put(`/api/ventures/${id}`, data);
// Alias for old calls
export const getCompanies = getVentures;
export const getCompanyById = getVentureById;

// ─── Teams ─────────────────────────────────────────────────────────────────
export const getTeams = () => api.get('/api/teams');
export const getTeamById = (id) => api.get(`/api/teams/${id}`);
export const createTeam = (data) => api.post('/api/teams', data);
export const updateTeam = (id, data) => api.put(`/api/teams/${id}`, data);
export const addTeamMember = (teamId, userId) => api.post(`/api/teams/${teamId}/members`, { user_id: userId });
export const removeTeamMember = (teamId, userId) => api.delete(`/api/teams/${teamId}/members/${userId}`);

// ─── Announcements ─────────────────────────────────────────────────────────
export const getAnnouncements = () => api.get('/api/announcements');
export const createAnnouncement = (data) => api.post('/api/announcements', data);
export const deleteAnnouncement = (id) => api.delete(`/api/announcements/${id}`);

// ─── Tasks ─────────────────────────────────────────────────────────────────
export const getTasks = () => api.get('/api/tasks');
export const createTask = (data) => api.post('/api/tasks', data);
export const updateTask = (id, data) => api.put(`/api/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/api/tasks/${id}`);

// ─── Projects ──────────────────────────────────────────────────────────────
export const getProjects = () => api.get('/api/projects');
export const createProject = (data) => api.post('/api/projects', data);
export const updateProject = (id, data) => api.put(`/api/projects/${id}`, data);
export const assignClientToProject = (projectId, clientId) =>
    api.post(`/api/projects/${projectId}/clients`, { client_id: clientId });

// ─── Onboarding (Invite Links) ──────────────────────────────────────────────
export const listOnboardingInvites = () => api.get('/api/onboarding/invites');
export const createOnboardingInvite = (data) => api.post('/api/onboarding/invites', data);
export const updateOnboardingInvite = (id, data) => api.patch(`/api/onboarding/invites/${id}`, data);
export const decideOnboardingInvite = (id, data) => api.post(`/api/onboarding/invites/${id}/decision`, data);
export const onboardFromInvite = (id) => api.post(`/api/onboarding/invites/${id}/onboard`);

// Public-by-token (no auth required)
export const getPublicInvite = (token) => api.get(`/api/onboarding/public/${token}`);
export const submitPublicInvite = (token, data) => api.post(`/api/onboarding/public/${token}/submit`, data);
