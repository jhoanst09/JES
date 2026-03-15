'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

/**
 * Toast Notification Component
 * Glassmorphism design matching JES aesthetic
 */
export default function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const icons = {
        success: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        info: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                <path strokeLinecap="round" strokeWidth={2.5} d="M12 16v-4m0-4h.01" />
            </svg>
        )
    };

    const colors = {
        success: 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-600 dark:text-green-400',
        error: 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-600 dark:text-red-400',
        info: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-600 dark:text-blue-400'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={`
                flex items-center gap-3 px-5 py-4 
                rounded-3xl border backdrop-blur-xl
                bg-gradient-to-br ${colors[type]}
                shadow-2xl shadow-black/10 dark:shadow-black/30
                min-w-[280px] max-w-md
            `}
        >
            <div className="flex-shrink-0">
                {icons[type]}
            </div>
            <p className="flex-1 text-sm font-bold tracking-wide">
                {message}
            </p>
            <button
                onClick={onClose}
                className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                aria-label="Cerrar"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </motion.div>
    );
}

/**
 * Toast Container - Fixed position top-right
 */
export function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            onClose={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
}
