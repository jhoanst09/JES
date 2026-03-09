'use client';
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { ToastContainer } from '../components/Toast';

/**
 * JES Notification System — Entire.io Integration
 * 
 * Manages toast notifications with:
 * - Stacking logic (max 5 visible)
 * - Category-based auto-dismiss (info=5s, success=4s, warning=8s, error=manual)
 * - Session tracking for Entire.io checkpoint linking
 * - Optional persistence to jes-core
 * - Burst protection (max 3 per second)
 */

const ToastContext = createContext();

let toastId = 0;

// Burst protection: max notifications per second
const BURST_LIMIT = 3;
const BURST_WINDOW_MS = 1000;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const burstTimestamps = useRef([]);
    const sessionLog = useRef([]); // Entire.io session log

    // Clean up object URLs on unmount
    useEffect(() => {
        return () => {
            sessionLog.current = [];
        };
    }, []);

    /**
     * Show a toast notification.
     * 
     * @param {string} message - Notification message
     * @param {string} type - Category: 'info' | 'success' | 'warning' | 'error'
     * @param {object} options - { title, icon, actionUrl, metadata }
     */
    const showToast = useCallback((message, type = 'success', options = {}) => {
        // Burst protection
        const now = Date.now();
        burstTimestamps.current = burstTimestamps.current.filter(
            t => now - t < BURST_WINDOW_MS
        );
        if (burstTimestamps.current.length >= BURST_LIMIT) {
            console.warn('[Notifications] Burst limit reached, dropping notification');
            return;
        }
        burstTimestamps.current.push(now);

        const id = toastId++;
        const toast = {
            id,
            message,
            type,
            title: options.title || null,
            icon: options.icon || null,
            timestamp: new Date().toISOString(),
        };

        setToasts(prev => [...prev, toast]);

        // Log to Entire.io session
        sessionLog.current.push({
            ...toast,
            metadata: options.metadata || {},
            checkpoint: `notif-${id}`,
        });

        // Persist to sessionStorage for Entire.io history
        try {
            const existing = JSON.parse(sessionStorage.getItem('jes_notification_log') || '[]');
            existing.push(toast);
            // Keep last 100 notifications in session
            const trimmed = existing.slice(-100);
            sessionStorage.setItem('jes_notification_log', JSON.stringify(trimmed));
        } catch (_) {
            // sessionStorage unavailable (SSR)
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    /**
     * Get the notification session log (Entire.io compatible).
     */
    const getSessionLog = useCallback(() => {
        return sessionLog.current;
    }, []);

    /**
     * Clear all active toasts.
     */
    const clearAll = useCallback(() => {
        setToasts([]);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, removeToast, clearAll, getSessionLog }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
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
