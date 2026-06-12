import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabaseClient';
import { UserLicense } from '@/types';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    license: UserLicense | null;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    license: null,
    signOut: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [license, setLicense] = useState<UserLicense | null>(null);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                checkLicense(session.user);
            } else {
                setLoading(false);
            }
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                checkLicense(session.user);
            } else {
                setLicense(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkLicense = async (user: User) => {
        try {
            // 1. Try to fetch existing license
            const { data, error } = await supabase
                .from('user_licenses')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setLicense(data);
            } else {
                // 2. If not found, create one (Pending)
                const newLicense = {
                    user_id: user.id,
                    email: user.email || '',
                    status: 'pending' as const
                };

                const { error: insertError } = await supabase
                    .from('user_licenses')
                    .insert([newLicense]);

                if (!insertError) {
                    setLicense(newLicense as UserLicense);
                } else {
                    console.error('Error creating license:', insertError);
                }
            }
        } catch (err) {
            console.error('Error checking license:', err);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setLicense(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, license, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
