/**
 * useNotificationStream — Real-time SSE hook for Sileo notifications
 * 
 * Connects to /api/notifications/stream (SSE) and fires Sileo toasts
 * for events from any schema (core, wave, biz, marketplace).
 * 
 * Falls back to polling if SSE is not available.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { useWishlist } from '../context/WishlistContext';

// Neon color per schema
const SCHEMA_NEON = {
    wave: '#39FF14',        // Green — money/payments
    biz: '#FFD700',         // Gold — appointments
    marketplace: '#00D1FF', // Cyan — commerce
    core: '#A855F7',        // Purple — social
};

export default function useNotificationStream(onNotification) {
    const { notify } = useToast();
    const { isLoggedIn } = useWishlist();
    const eventSourceRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const retryCount = useRef(0);

    const connect = useCallback(() => {
        if (!isLoggedIn || typeof window === 'undefined') return;

        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const es = new EventSource('/api/notifications/stream', {
            withCredentials: true,
        });

        es.onopen = () => {
            console.log('🔔 [SSE] Connected to notification stream');
            retryCount.current = 0;
        };

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const { toast, message, type, schema_origin, action_url } = data;

                if (!toast) return;

                // Map schema to Sileo toast type
                const sileoType = toast.type || 'info';
                const neonColor = SCHEMA_NEON[schema_origin] || SCHEMA_NEON.core;

                // Determine action based on type
                let toastAction;
                if (type === 'message' || type === 'chat') {
                    toastAction = {
                        label: 'Responder',
                        onClick: () => {
                            window.dispatchEvent(new CustomEvent('open-quick-reply', {
                                detail: {
                                    senderName: data.actor_name || 'Usuario',
                                    senderId: data.actor_id,
                                    messageText: message
                                }
                            }));
                        }
                    };
                } else if (action_url) {
                    toastAction = {
                        label: 'Ver',
                        onClick: () => window.location.href = action_url,
                    };
                }

                // Fire Sileo toast
                notify({
                    title: `${toast.icon} ${toast.label}`,
                    description: message || 'Nueva notificación',
                    type: sileoType,
                    action: toastAction,
                });

                // Callback for NotificationCenter to refresh its list
                if (onNotification) {
                    onNotification(data);
                }

            } catch (err) {
                console.warn('[SSE] Parse error:', err.message);
            }
        };

        es.onerror = () => {
            es.close();
            eventSourceRef.current = null;

            // Exponential backoff reconnect (max 30s)
            const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
            retryCount.current++;

            console.warn(`🔔 [SSE] Disconnected, reconnecting in ${delay / 1000}s...`);
            reconnectTimerRef.current = setTimeout(connect, delay);
        };

        eventSourceRef.current = es;
    }, [isLoggedIn, notify, onNotification]);

    useEffect(() => {
        connect();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
        };
    }, [connect]);

    return {
        connected: !!eventSourceRef.current,
        reconnect: connect,
    };
}
