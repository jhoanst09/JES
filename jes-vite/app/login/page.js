'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';

/**
 * /login Route
 * 
 * Redirects to:
 * - /profile if not logged in (shows login form)
 * - / (home) if already logged in
 */
export default function LoginPage() {
    const router = useRouter();
    const { isLoggedIn, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (isLoggedIn) {
                router.replace('/');
            } else {
                router.replace('/profile');
            }
        }
    }, [isLoggedIn, loading, router]);

    // Loading state while checking auth
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-zinc-500">Redirigiendo...</p>
            </div>
        </div>
    );
}
