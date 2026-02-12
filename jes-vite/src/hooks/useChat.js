/**
 * useChat Hook
 * 
 * Hook for chat functionality.
 * Supports both legacy room-based chats AND new conversation-based chats.
 * Detects UUIDs to route to /api/conversations/[id]/messages.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadToS3 } from '../utils/s3';

// UUID v4 pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useChat(roomId = 'general', userId = null) {
    const { user, isLoggedIn } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const pollingRef = useRef(null);

    const currentUserId = userId || user?.id;
    const isConversation = roomId && UUID_REGEX.test(roomId);

    // Fetch messages
    const fetchMessages = useCallback(async () => {
        if (!roomId) return;

        try {
            const url = isConversation
                ? `/api/conversations/${roomId}/messages?limit=50`
                : `/api/chat/messages?roomId=${roomId}`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    }, [roomId, isConversation]);

    // Load messages and setup polling
    useEffect(() => {
        setMessages([]);
        setLoading(true);
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
    const sendMessage = async (content, contentType = 'text', fileUrl = null) => {
        if (!currentUserId || (!content?.trim() && !fileUrl)) return;

        setSending(true);
        try {
            let mediaUrl = fileUrl;

            if (isConversation) {
                // New conversation API
                const res = await fetch(`/api/conversations/${roomId}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        senderId: currentUserId,
                        content: content?.trim() || '',
                        contentType,
                        fileUrl: mediaUrl,
                    }),
                });

                if (res.ok) {
                    const { message } = await res.json();
                    setMessages(prev => [...prev, message]);
                }
            } else {
                // Legacy API
                const res = await fetch('/api/chat/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        roomId,
                        senderId: currentUserId,
                        content: content?.trim() || '',
                        mediaUrl,
                    }),
                });

                if (res.ok) {
                    const { message } = await res.json();
                    setMessages(prev => [...prev, message]);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    // Upload file and send
    const uploadFile = async (file) => {
        try {
            const url = await uploadToS3(file, 'chat');
            return url;
        } catch (error) {
            console.error('Error uploading file:', error);
            return null;
        }
    };

    // Send image
    const sendImage = async (file) => {
        const url = await uploadFile(file);
        if (url) await sendMessage('', 'image', url);
    };

    // Send file
    const sendFile = async (file) => {
        const url = await uploadFile(file);
        if (url) await sendMessage(file.name, 'file', url);
    };

    // Stub functions for compatibility with chat page
    const sendTyping = useCallback(() => { }, []);
    const retryMessage = useCallback(() => { }, []);

    return {
        messages,
        loading,
        sending,
        sendMessage,
        sendImage,
        sendFile,
        uploadFile,
        sendTyping,
        retryMessage,
        pendingCount: 0,
        isPartnerOnline: false,
        isPartnerTyping: false,
        error: null,
        refreshMessages: fetchMessages,
        isConnected: isLoggedIn,
    };
}

export default useChat;
