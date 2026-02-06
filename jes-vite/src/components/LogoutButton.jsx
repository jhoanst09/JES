'use client';

import { signOut } from '@/app/auth/actions';

/**
 * Logout Button Component
 * Uses Server Action to properly clear HttpOnly cookies
 * 
 * Usage:
 * <LogoutButton className="my-styles">Cerrar Sesión</LogoutButton>
 */
export default function LogoutButton({ children, className = '', ...props }) {
    return (
        <form action={signOut}>
            <button
                type="submit"
                className={className}
                {...props}
            >
                {children || 'Cerrar Sesión'}
            </button>
        </form>
    );
}

/**
 * Alternative: Inline form for use directly in components
 * Use this if you don't want to import a separate component
 * 
 * Example in your component:
 * import { signOut } from '@/app/auth/actions';
 * 
 * <form action={signOut}>
 *   <button type="submit">Cerrar Sesión</button>
 * </form>
 */
