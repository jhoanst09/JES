'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * AuthContext - JWT + Redis Architecture
 * 
 * Clean auth without Supabase.
 * - JWT token in httpOnly cookie
 * - Redis for fast session validation
 * - Optimistic UI updates
 */

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // ==========================================
    // FETCH CURRENT USER
    // ==========================================
    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user || null);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    // Detect OAuth callback success (login=success in URL)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('login') === 'success') {
                // Remove the param from URL without reload
                window.history.replaceState({}, '', window.location.pathname);
                // Refresh user data from server
                fetchUser();
            }
        }
    }, [fetchUser]);

    // ==========================================
    // LOGIN
    // ==========================================
    const login = useCallback(async ({ email, password }) => {
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al iniciar sesión');
            }

            setUser(data.user);
            router.push('/profile');
            return data;

        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    }, [router]);

    // ==========================================
    // REGISTER
    // ==========================================
    const register = useCallback(async ({ email, password, name }) => {
        setLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al registrar');
            }

            setUser(data.user);
            router.push('/profile');
            return data;

        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    }, [router]);

    // ==========================================
    // SIGN OUT - Hard Redirect Flow
    // ==========================================
    const signOut = useCallback(async () => {
        try {
            // 1. ⚡ OPTIMISTIC UI: Clear user immediately
            setUser(null);

            // 2. Fire server cleanup FIRST (before redirect)
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
            } catch (e) {
                console.warn('Server logout failed, continuing with client cleanup');
            }

            // 3. Clear local storage
            if (typeof window !== 'undefined') {
                localStorage.clear();
                sessionStorage.clear();

                // 4. DELETE SESSION COOKIE CLIENT-SIDE
                // This ensures the browser doesn't send the cookie on next request
                document.cookie = 'auth_token=; Max-Age=0; path=/; SameSite=Lax';

                // 5. HARD REDIRECT: Force complete browser reload
                // This clears ALL React state and memory in one shot
                window.location.href = '/login';
            }

        } catch (error) {
            console.error('Error en logout:', error);
            // Fallback: Force navigation even on error
            if (typeof window !== 'undefined') {
                document.cookie = 'auth_token=; Max-Age=0; path=/;';
                window.location.href = '/login';
            }
        }
    }, [router]);

    // ==========================================
    // REFRESH USER
    // ==========================================
    const refreshUser = useCallback(async () => {
        await fetchUser();
    }, [fetchUser]);

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isLoggedIn: !!user,
            login,
            register,
            signOut,
            refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// SSR-safe defaults for when context is unavailable during prerender
const defaultAuthContext = {
    user: null,
    loading: false,
    isLoggedIn: false,
    login: async () => { },
    register: async () => { },
    signOut: async () => { },
    refreshUser: async () => { },
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    // Return context if available and not empty, otherwise defaults
    return context && Object.keys(context).length > 0 ? context : defaultAuthContext;
};
export default useAuth;
