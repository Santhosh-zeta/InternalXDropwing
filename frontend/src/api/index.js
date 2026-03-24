import api from './client';

// ─── Auth / Profile ────────────────────────────────────────────────────────
export const getMe = () => api.get('/api/users/me');

// ─── Users ────────────────────────────────────────────────────────────────
export const getUsers          = (params = {}) => api.get('/api/users', { params });
export const getUsersByCompany = (companyId, params = {}) => api.get(`/api/users/company/${companyId}`, { params });
export const getUserById       = (id) => api.get(`/api/users/${id}`);
export const createUser        = (data) => api.post('/api/users', data);
export const updateUser        = (id, data) => api.put(`/api/users/${id}`, data);
export const deleteUser        = (id) => api.delete(`/api/users/${id}`);

// ─── Companies ──────────────────────────────────────────────────────────────
export const getCompanies   = (params = {}) => api.get('/api/companies', { params });
export const getCompanyById = (id) => api.get(`/api/companies/${id}`);
export const createCompany  = (data) => api.post('/api/companies', data);
export const updateCompany  = (id, data) => api.put(`/api/companies/${id}`, data);

// ─── Teams ─────────────────────────────────────────────────────────────────
export const getTeams        = (params = {}) => api.get('/api/teams', { params });
export const getTeamById     = (id) => api.get(`/api/teams/${id}`);
export const createTeam      = (data) => api.post('/api/teams', data);
export const updateTeam      = (id, data) => api.put(`/api/teams/${id}`, data);
export const addTeamMember   = (teamId, userId) => api.post(`/api/teams/${teamId}/members`, { user_id: userId });
export const removeTeamMember = (teamId, userId) => api.delete(`/api/teams/${teamId}/members/${userId}`);

// ─── Announcements ─────────────────────────────────────────────────────────
export const getAnnouncements   = () => api.get('/api/announcements');
export const createAnnouncement = (data) => api.post('/api/announcements', data);
export const deleteAnnouncement = (id) => api.delete(`/api/announcements/${id}`);

// ─── Tasks ─────────────────────────────────────────────────────────────────
export const getTasks    = (params = {}) => api.get('/api/tasks', { params });
export const createTask  = (data) => api.post('/api/tasks', data);
export const updateTask  = (id, data) => api.put(`/api/tasks/${id}`, data);
export const deleteTask  = (id) => api.delete(`/api/tasks/${id}`);

// ─── Task Comments & Activity ───────────────────────────────────────────────
export const getTaskComments = (taskId) => api.get(`/api/tasks/${taskId}/comments`);
export const addTaskComment  = (taskId, data) => api.post(`/api/tasks/${taskId}/comments`, data);
export const getTaskActivity = (taskId) => api.get(`/api/tasks/${taskId}/activity`);

// ─── Task Approvals (Phase 3) ─────────────────────────────────────────────
export const getTaskApprovals = (taskId) => api.get(`/api/tasks/${taskId}/approvals`);
export const requestApproval  = (taskId, data) => api.post(`/api/tasks/${taskId}/approvals`, data);
export const resolveApproval  = (taskId, approvalId, data) => api.put(`/api/tasks/${taskId}/approvals/${approvalId}`, data);

// ─── Task Files (Phase 3) ──────────────────────────────────────────────────
export const getTaskFiles = (taskId) => api.get(`/api/tasks/${taskId}/files`);
export const attachFileMetadata = (taskId, data) => api.post(`/api/tasks/${taskId}/files`, data);
export const deleteTaskFile = (taskId, fileId) => api.delete(`/api/tasks/${taskId}/files/${fileId}`);

// ─── Projects ──────────────────────────────────────────────────────────────
export const getProjects          = (params = {}) => api.get('/api/projects', { params });
export const getProjectById       = (id) => api.get(`/api/projects/${id}`);
export const createProject        = (data) => api.post('/api/projects', data);
export const updateProject        = (id, data) => api.put(`/api/projects/${id}`, data);
export const assignClientToProject = (projectId, clientId) =>
    api.post(`/api/projects/${projectId}/clients`, { client_id: clientId });
export const assignTeamToProject  = (projectId, teamId) =>
    api.post(`/api/projects/${projectId}/teams`, { team_id: teamId });
export const removeTeamFromProject = (projectId, teamId) =>
    api.delete(`/api/projects/${projectId}/teams/${teamId}`);

// ─── Onboarding (Invite Links) ──────────────────────────────────────────────
export const listOnboardingInvites  = () => api.get('/api/onboarding/invites');
export const createOnboardingInvite = (data) => api.post('/api/onboarding/invites', data);
export const updateOnboardingInvite = (id, data) => api.patch(`/api/onboarding/invites/${id}`, data);
export const decideOnboardingInvite = (id, data) => api.post(`/api/onboarding/invites/${id}/decision`, data);
export const onboardFromInvite      = (id) => api.post(`/api/onboarding/invites/${id}/onboard`);

// Public-by-token (no auth required)
export const getPublicInvite   = (token) => api.get(`/api/onboarding/public/${token}`);
export const submitPublicInvite = (token, data) => api.post(`/api/onboarding/public/${token}/submit`, data);

// ─── System Timeline ────────────────────────────────────────────────────────
export const getTimeline = (params = {}) => api.get('/api/timeline', { params });

// ─── Pagination helper ──────────────────────────────────────────────────────
// Extracts flat data array from paginated OR legacy plain-array responses
// Usage: const tasks = extractData(response.data)
export const extractData = (responseData) => {
    if (!responseData) return [];
    if (Array.isArray(responseData)) return responseData;  // legacy
    if (Array.isArray(responseData.data)) return responseData.data;  // paginated
    return [];
};
