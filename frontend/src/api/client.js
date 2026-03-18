import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    headers: { 'Content-Type': 'application/json' },
});

let currentAccessToken = null;

// Immediately sync the token on load
supabase.auth.getSession().then(({ data: { session } }) => {
    currentAccessToken = session?.access_token || null;
});

// Keep token synced across auth state changes (login, logout, refresh)
supabase.auth.onAuthStateChange((_event, session) => {
    currentAccessToken = session?.access_token || null;
});

// Attach JWT to every request without hitting Supabase async token refresh API concurrently
api.interceptors.request.use((config) => {
    if (currentAccessToken) {
        config.headers.Authorization = `Bearer ${currentAccessToken}`;
    }
    return config;
});

// Handle auth errors globally
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        if (error.response?.status === 401) {
            try {
                // Forcibly clear local storage key just in case signOut fails or is too slow
                const url = import.meta.env.VITE_SUPABASE_URL;
                if (url) {
                    const projectId = url.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
                    localStorage.removeItem(`sb-${projectId}-auth-token`);
                }
                await supabase.auth.signOut();
            } catch (e) {
                console.error('Signout error:', e);
            } finally {
                // Prevent infinite redirect loops by making sure we only redirect once
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
