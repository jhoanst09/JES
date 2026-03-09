'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * JES Notification Toast — Glassmorphism Design
 * 
 * Positioned bottom-left, responsive, non-blocking.
 * Categories map to Entire.io log levels:
 *   info    → blue gradient (chat, social)
 *   success → green gradient (payments, mining)
 *   warning → amber gradient (low balance)
 *   error   → red gradient (failed tx)
 */

const CATEGORY_STYLES = {
    info: {
        gradient: 'from-blue-500/15 via-cyan-500/10 to-blue-600/15',
        border: 'border-blue-500/20',
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-400',
        accent: 'bg-blue-500',
    },
    success: {
        gradient: 'from-emerald-500/15 via-green-500/10 to-emerald-600/15',
        border: 'border-emerald-500/20',
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-400',
        accent: 'bg-emerald-500',
    },
    warning: {
        gradient: 'from-amber-500/15 via-orange-500/10 to-amber-600/15',
        border: 'border-amber-500/20',
        iconBg: 'bg-amber-500/20',
        iconColor: 'text-amber-400',
        accent: 'bg-amber-500',
    },
    error: {
        gradient: 'from-red-500/15 via-rose-500/10 to-red-600/15',
        border: 'border-red-500/20',
        iconBg: 'bg-red-500/20',
        iconColor: 'text-red-400',
        accent: 'bg-red-500',
    },
};

const CATEGORY_ICONS = {
    info: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
            <path strokeLinecap="round" strokeWidth={2} d="M12 16v-4m0-4h.01" />
        </svg>
    ),
    success: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
    ),
    warning: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
    ),
    error: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
};

const AUTO_DISMISS_MS = {
    info: 5000,
    success: 4000,
    warning: 8000,
    error: 0, // manual close only
};

export default function Toast({ message, type = 'success', title, icon, onClose, index = 0 }) {
    const style = CATEGORY_STYLES[type] || CATEGORY_STYLES.info;
    const dismissMs = AUTO_DISMISS_MS[type];
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (dismissMs <= 0) return;

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / dismissMs) * 100);
            setProgress(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
                onClose();
            }
        }, 50);

        return () => clearInterval(interval);
    }, [dismissMs, onClose]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -80, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -60, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={onClose}
            className={`
                relative overflow-hidden cursor-pointer
                w-[calc(100vw-2rem)] sm:w-[380px] md:w-[400px]
                rounded-2xl border backdrop-blur-xl
                bg-gradient-to-br ${style.gradient} ${style.border}
                shadow-2xl shadow-black/20 dark:shadow-black/40
                transition-all hover:scale-[1.02] hover:shadow-3xl
            `}
            role="alert"
            aria-live="polite"
        >
            {/* Accent bar left */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.accent} rounded-l-2xl`} />

            <div className="flex items-start gap-3 px-5 py-4 pl-6">
                {/* Icon */}
                <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${style.iconBg} ${style.iconColor} flex items-center justify-center mt-0.5`}>
                    {icon ? <span className="text-lg">{icon}</span> : CATEGORY_ICONS[type]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {title && (
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 mb-0.5">
                            {title}
                        </p>
                    )}
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-snug line-clamp-2">
                        {message}
                    </p>
                    <p className="text-[9px] font-mono text-zinc-400 dark:text-zinc-600 mt-1 uppercase tracking-wider">
                        {type === 'error' ? 'clic para cerrar' : 'descartable'}
                    </p>
                </div>

                {/* Close button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/10 dark:bg-black/20 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors mt-0.5"
                    aria-label="Cerrar notificación"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Progress bar (auto-dismiss indicator) */}
            {dismissMs > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
                    <motion.div
                        className={`h-full ${style.accent} opacity-50`}
                        style={{ width: `${progress}%` }}
                        transition={{ duration: 0.05 }}
                    />
                </div>
            )}
        </motion.div>
    );
}

/**
 * Toast Container — Fixed bottom-left, responsive stacking
 * Max 5 visible, newest on top
 */
export function ToastContainer({ toasts, removeToast }) {
    // Only show the latest 5 toasts
    const visibleToasts = toasts.slice(-5);

    return (
        <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[9999] flex flex-col-reverse gap-3 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {visibleToasts.map((toast, index) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            title={toast.title}
                            icon={toast.icon}
                            index={index}
                            onClose={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
}
