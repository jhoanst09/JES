'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * usePresence Hook - Tracks online status using Redis
 * 
 * Uses Upstash Redis for real-time presence tracking.
 * Marks user online every 30 seconds while active.
 */

const REDIS_URL = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN;
const IS_DEV = process.env.NODE_ENV === 'development';

function log(...args) {
    if (IS_DEV) {
        console.log(`[PRESENCE ${Date.now()}]`, ...args);
    }
}

async function redis(command, ...args) {
    if (!REDIS_URL || !REDIS_TOKEN) return null;

    try {
        const response = await fetch(REDIS_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${REDIS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([command, ...args]),
            cache: 'no-store'
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.result;
    } catch {
        return null;
    }
}

export function usePresence(currentUserId) {
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [isConnected, setIsConnected] = useState(false);
    const intervalRef = useRef(null);
    const isMountedRef = useRef(true);

    // Check if a specific user is online
    const isUserOnline = useCallback((userId) => {
        return onlineUsers.has(userId);
    }, [onlineUsers]);

    // Mark self as online
    const setOnline = useCallback(async () => {
        if (!currentUserId) return;

        const result = await redis('SET', `presence:${currentUserId}`, Date.now().toString(), 'EX', 60);
        if (result === 'OK') {
            log('✅ Marked online');
            setIsConnected(true);
        }
    }, [currentUserId]);

    // Mark self as offline
    const setOffline = useCallback(async () => {
        if (!currentUserId) return;

        await redis('DEL', `presence:${currentUserId}`);
        log('👋 Marked offline');
    }, [currentUserId]);

    // Check who is online from a list of user IDs
    const checkOnline = useCallback(async (userIds) => {
        if (!userIds?.length) return;

        const keys = userIds.map(id => `presence:${id}`);
        const results = await redis('MGET', ...keys);

        if (!results || !isMountedRef.current) return;

        const newOnline = new Set();
        results.forEach((result, index) => {
            if (result !== null) {
                newOnline.add(userIds[index]);
            }
        });

        setOnlineUsers(newOnline);
        log(`Online: ${newOnline.size} users`);
    }, []);

    // Initialize presence
    useEffect(() => {
        isMountedRef.current = true;

        if (!currentUserId || !REDIS_URL) {
            log('⚠️ Presence disabled (no user or Redis)');
            return;
        }

        // Mark online immediately
        setOnline();

        // Heartbeat every 30 seconds
        intervalRef.current = setInterval(() => {
            setOnline();
        }, 30000);

        // Mark offline when leaving
        const handleBeforeUnload = () => {
            // Use sendBeacon for reliability
            if (navigator.sendBeacon && REDIS_URL && REDIS_TOKEN) {
                const body = JSON.stringify(['DEL', `presence:${currentUserId}`]);
                navigator.sendBeacon(REDIS_URL, body);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            window.removeEventListener('beforeunload', handleBeforeUnload);
            setOffline();
        };
    }, [currentUserId, setOnline, setOffline]);

    return {
        onlineUsers,
        isUserOnline,
        isConnected,
        checkOnline,
        setOnline,
        setOffline
    };
}

export default usePresence;
