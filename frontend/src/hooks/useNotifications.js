import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Hook for real-time notifications via Supabase Realtime
 * Falls back gracefully if notifications table doesn't exist yet
 */
export const useNotifications = () => {
    const { profile } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!profile?.id) return;
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(30);

            if (!error && data) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.read).length);
            }
        } catch {
            // Table may not exist yet — silent fail
        }
    }, [profile?.id]);

    // Mark all as read
    const markAllRead = useCallback(async () => {
        if (!profile?.id) return;
        try {
            await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', profile.id)
                .eq('read', false);
            setNotifications(n => n.map(x => ({ ...x, read: true })));
            setUnreadCount(0);
        } catch { }
    }, [profile?.id]);

    const markOneRead = useCallback(async (id) => {
        try {
            await supabase.from('notifications').update({ read: true }).eq('id', id);
            setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
            setUnreadCount(c => Math.max(0, c - 1));
        } catch { }
    }, []);

    useEffect(() => {
        fetchNotifications();

        if (!profile?.id) return;

        // Realtime subscription
        const channel = supabase
            .channel(`notifications:${profile.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${profile.id}`,
            }, (payload) => {
                setNotifications(prev => [payload.new, ...prev]);
                setUnreadCount(c => c + 1);
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [profile?.id, fetchNotifications]);

    return { notifications, unreadCount, markAllRead, markOneRead, refetch: fetchNotifications };
};
