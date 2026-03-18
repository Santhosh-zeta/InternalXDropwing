import { useState, useEffect } from 'react';

/**
 * Hook that returns [theme, toggleTheme]
 * theme is 'dark' | 'light'
 * Persists to localStorage and applies data-theme to <html>
 */
export const useTheme = () => {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('dropwing-theme') || 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('dropwing-theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    return [theme, toggleTheme];
};
