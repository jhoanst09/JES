'use client';
import { createContext, useContext, useCallback } from 'react';

/**
 * Toast Context — Powered by Sileo
 * 
 * Replaces the old custom toast system with Sileo's SVG-morphing toasts.
 * Maintains backward compatibility: showToast(message, type) still works.
 * Also exposes the raw `sileo` controller for advanced usage.
 */

let sileoInstance = null;

// Lazy import sileo to avoid SSR issues
async function getSileo() {
    if (sileoInstance) return sileoInstance;
    const mod = await import('sileo');
    sileoInstance = mod.sileo;
    return sileoInstance;
}

const ToastContext = createContext();

// Auto-dismiss durations per category
const DURATIONS = {
    info: { expand: 1200, collapse: 5000 },
    success: { expand: 1500, collapse: 7000 },
    warning: { expand: 2000, collapse: 8000 },
    error: false, // Manual dismiss only
};

export function ToastProvider({ children }) {
    /**
     * showToast(message, type) — Backward-compatible API
     */
    const showToast = useCallback(async (message, type = 'success') => {
        const sileo = await getSileo();
        const method = sileo[type] || sileo.info;

        method({
            title: message,
            autopilot: DURATIONS[type] ?? DURATIONS.info,
        });
    }, []);

    /**
     * notify — Rich notification for backend events
     */
    const notify = useCallback(async ({ title, description, type = 'info', action, icon, persist = false }) => {
        const sileo = await getSileo();
        const method = sileo[type] || sileo.info;

        const options = {
            title,
            description,
            icon,
            autopilot: persist ? false : (DURATIONS[type] ?? DURATIONS.info),
        };

        if (action) {
            options.button = {
                title: action.label || 'Ver',
                onClick: action.onClick || (() => { }),
            };
        }

        method(options);
    }, []);

    /**
     * promiseToast — For async operations (payments, uploads, etc.)
     */
    const promiseToast = useCallback(async (promise, states) => {
        const sileo = await getSileo();
        return sileo.promise(promise, {
            loading: { ...states.loading },
            success: (data) => ({
                ...(typeof states.success === 'function' ? states.success(data) : states.success),
            }),
            error: (err) => ({
                ...(typeof states.error === 'function' ? states.error(err) : states.error),
                autopilot: false,
            }),
        });
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, notify, promiseToast }}>
            {children}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}
