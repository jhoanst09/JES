/**
 * useChat Hook
 * 
 * Hook for chat functionality.
 * Uses API routes instead of direct Supabase.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadToS3 } from '../utils/s3';

export function useChat(roomId = 'general') {
    const { user, isLoggedIn } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const pollingRef = useRef(null);

    // Fetch messages
    const fetchMessages = useCallback(async () => {
        if (!roomId) return;

        try {
            const res = await fetch(`/api/chat/messages?roomId=${roomId}`);
            if (res.ok) {
                const { messages } = await res.json();
                setMessages(messages || []);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    }, [roomId]);

    // Load messages and setup polling
    useEffect(() => {
        fetchMessages();

        // Poll for new messages every 3 seconds
        pollingRef.current = setInterval(fetchMessages, 3000);

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [fetchMessages]);

    // Send message
    const sendMessage = async (content, mediaFile = null) => {
        if (!user?.id || (!content.trim() && !mediaFile)) return;

        setSending(true);
        try {
            let mediaUrl = null;

            // Upload media to S3 if provided
            if (mediaFile) {
                mediaUrl = await uploadToS3(mediaFile, 'chat');
            }

            const res = await fetch('/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    senderId: user.id,
                    content: content.trim(),
                    mediaUrl,
                }),
            });

            if (res.ok) {
                const { message } = await res.json();
                // Optimistic add
                setMessages(prev => [...prev, message]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    // Send image
    const sendImage = async (file) => {
        return sendMessage('', file);
    };

    // Send file
    const sendFile = async (file) => {
        return sendMessage('', file);
    };

    return {
        messages,
        loading,
        sending,
        sendMessage,
        sendImage,
        sendFile,
        refreshMessages: fetchMessages,
        isConnected: isLoggedIn,
    };
}

export default useChat;
