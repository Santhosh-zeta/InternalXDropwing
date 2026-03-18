import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../api/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const hasFetchedProfile = useRef(false);

    const fetchProfile = async (userId) => {
        if (hasFetchedProfile.current) return;
        hasFetchedProfile.current = true;

        try {
            // First fetch the raw profile
            const { data, error } = await supabase
                .from('user_roles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error("AuthContext fetchProfile error:", error);
                setLoading(false);
                return;
            }

            if (data) {
                let venturesData = null;
                // If they have a venture, fetch it separately to avoid 406 join errors
                if (data.venture_id) {
                    const { data: vData } = await supabase
                        .from('ventures')
                        .select('id, name')
                        .eq('id', data.venture_id)
                        .single();
                    venturesData = vData;
                }

                setProfile({
                    ...data,
                    company_id: data.venture_id,
                    companies: venturesData,
                    ventures: venturesData,
                });
            }
        } catch (err) {
            console.error("AuthContext fetchProfile catch:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;

        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!mounted) return;

            setUser(session?.user ?? null);
            if (session?.user && !hasFetchedProfile.current) {
                await fetchProfile(session.user.id);
            } else if (!session?.user) {
                setLoading(false);
            }
        };

        if (!hasFetchedProfile.current) {
            initSession();
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;

            // Only clear profile and trigger re-fetch on ACTUAL sign in or sign out (not INITIAL_SESSION)
            if (event === 'SIGNED_IN') {
                setUser(session?.user ?? null);
                hasFetchedProfile.current = false;
                if (session?.user) fetchProfile(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                hasFetchedProfile.current = false;
                setLoading(false);
            } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                setUser(session?.user ?? null);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Set loading false once profile is fetched
    useEffect(() => {
        if (profile) setLoading(false);
    }, [profile]);

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
