'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useRealtime — Client-side real-time hook
 * 
 * Subscribes to Ably channels for live updates.
 * FALLBACK: If Ably is not configured, polls for notifications every 10s.
 * Implements backpressure: max 100 pending events queue.
 * 
 * Usage:
 *   const { lastEvent, isConnected } = useRealtime({
 *     channels: ['conv:uuid', 'user:uuid'],
 *     onMessage: (channel, event, data) => { ... },
 *   });
 */

const MAX_QUEUE_SIZE = 100;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // Exponential backoff
const POLL_INTERVAL = 10000; // 10s polling fallback

export default function useRealtime({ channels = [], onMessage, userId }) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);
    const [mode, setMode] = useState('connecting'); // 'ably' | 'polling' | 'connecting'
    const ablyRef = useRef(null);
    const channelRefs = useRef({});
    const eventQueue = useRef([]);
    const reconnectAttempt = useRef(0);
    const pollRef = useRef(null);

    // Backpressure: queue events and process them
    const enqueueEvent = useCallback((channel, event, data) => {
        const queue = eventQueue.current;

        // If queue full, drop non-critical events
        if (queue.length >= MAX_QUEUE_SIZE) {
            // Keep only critical events (messages, notifications)
            const critical = ['message', 'notification', 'friend_request'];
            if (!critical.includes(event)) return; // Drop typing, presence, etc.

            // Remove oldest non-critical event to make room
            const idx = queue.findIndex(e => !critical.includes(e.event));
            if (idx >= 0) queue.splice(idx, 1);
        }

        queue.push({ channel, event, data, timestamp: Date.now() });
        processQueue();
    }, []);

    const processQueue = useCallback(() => {
        while (eventQueue.current.length > 0) {
            const item = eventQueue.current.shift();
            try {
                onMessage?.(item.channel, item.event, item.data);
                setLastEvent(item);
            } catch (err) {
                console.error('[Realtime] Event handler error:', err);
            }
        }
    }, [onMessage]);

    // Initialize connection (Ably with polling fallback)
    useEffect(() => {
        if (!userId || channels.length === 0) return;

        let destroyed = false;

        async function connect() {
            try {
                // Get auth token from our API
                const res = await fetch(`/api/realtime/token?userId=${userId}`);

                // If Ably is not configured (503), switch to polling fallback
                if (res.status === 503 || !res.ok) {
                    console.log('[Realtime] Ably not configured, using polling fallback');
                    if (!destroyed) startPollingFallback();
                    return;
                }

                const { token } = await res.json();
                if (!token || destroyed) {
                    if (!destroyed) startPollingFallback();
                    return;
                }

                // Lazy-load Ably client SDK
                const Ably = (await import('ably')).default;
                const client = new Ably.Realtime({ token, autoConnect: true });

                client.connection.on('connected', () => {
                    if (destroyed) return;
                    setIsConnected(true);
                    setMode('ably');
                    reconnectAttempt.current = 0;
                    console.log('[Realtime] Connected via Ably');
                });

                client.connection.on('disconnected', () => {
                    if (destroyed) return;
                    setIsConnected(false);
                    scheduleReconnect();
                });

                client.connection.on('failed', () => {
                    if (destroyed) return;
                    setIsConnected(false);
                    scheduleReconnect();
                });

                // Subscribe to channels
                for (const channelName of channels) {
                    const channel = client.channels.get(channelName);
                    channel.subscribe((msg) => {
                        if (destroyed) return;
                        try {
                            const data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
                            enqueueEvent(channelName, msg.name, data);
                        } catch (err) {
                            console.error('[Realtime] Parse error:', err);
                        }
                    });
                    channelRefs.current[channelName] = channel;
                }

                ablyRef.current = client;
            } catch (err) {
                console.error('[Realtime] Connection error:', err);
                if (!destroyed) startPollingFallback();
            }
        }

        function startPollingFallback() {
            setMode('polling');
            setIsConnected(true); // Polling is "connected" (just slower)
            console.log('[Realtime] Polling fallback active (every 10s)');

            // Poll for unread notifications
            const poll = async () => {
                if (destroyed) return;
                try {
                    const res = await fetch(`/api/messages?userId=${userId}&unreadOnly=true&limit=5`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.messages?.length > 0) {
                            for (const msg of data.messages) {
                                enqueueEvent(`user:${userId}`, 'notification', {
                                    type: 'unread_message',
                                    conversationId: msg.conversation_id,
                                    content: msg.content,
                                });
                            }
                        }
                    }
                } catch { /* silent */ }
            };

            poll();
            pollRef.current = setInterval(poll, POLL_INTERVAL);
        }

        function scheduleReconnect() {
            const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)];
            reconnectAttempt.current++;
            setTimeout(() => {
                if (!destroyed) connect();
            }, delay);
        }

        connect();

        // Process queued events when tab becomes visible
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                processQueue();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            destroyed = true;
            document.removeEventListener('visibilitychange', handleVisibility);

            // Cleanup polling
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }

            // Cleanup Ably subscriptions
            for (const channel of Object.values(channelRefs.current)) {
                try { channel.unsubscribe(); } catch { }
            }
            channelRefs.current = {};

            if (ablyRef.current) {
                try { ablyRef.current.close(); } catch { }
                ablyRef.current = null;
            }
            setIsConnected(false);
        };
    }, [userId, channels.join(',')]); // Reconnect if channels change

    return { isConnected, lastEvent, mode };
}
