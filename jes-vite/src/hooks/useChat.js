/**
 * useChat Hook
 * 
 * Chat hook with smart polling, optimistic messages, and status tracking.
 * Supports both legacy room-based chats AND new conversation-based chats.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePresence } from './usePresence';

// UUID v4 pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Message status constants
export const MSG_STATUS = {
    SENDING: 'sending',
    SENT: 'sent',
    READ: 'read',
    FAILED: 'failed',
};

export function useChat(roomId = null, userId = null) {
    const { user, isLoggedIn } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [isPartnerTypingState, setIsPartnerTypingState] = useState(false);
    const pollingRef = useRef(null);
    const typingPollRef = useRef(null);
    const messagesRef = useRef([]);
    const tempIdCounter = useRef(0);
    const lastTypingSentRef = useRef(0);

    const currentUserId = userId || user?.id;
    const isConversation = roomId && UUID_REGEX.test(roomId);
    const { isUserOnline, setTyping: setPresenceTyping, checkTyping } = usePresence(currentUserId);

    // Keep ref in sync
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Fetch messages with smart deduplication
    const fetchMessages = useCallback(async (isInitial = false) => {
        if (!roomId) return;

        try {
            const url = isConversation
                ? `/api/messages?conversationId=${roomId}&limit=50`
                : `/api/chat/messages?roomId=${roomId}`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const serverMessages = data.messages || [];

                setMessages(prev => {
                    // Get pending/sending/failed messages (optimistic ones)
                    const pendingMsgs = prev.filter(m => m._status === MSG_STATUS.SENDING || m._status === MSG_STATUS.FAILED);

                    // Check if server messages actually changed
                    const prevServerMsgs = prev.filter(m => !m._tempId);
                    const serverIds = serverMessages.map(m => m.id).join(',');
                    const prevIds = prevServerMsgs.map(m => m.id).join(',');

                    if (serverIds === prevIds && !isInitial) {
                        // No changes from server, keep current state
                        return prev;
                    }

                    // Remove pending messages that now appear in server data
                    const serverMsgIds = new Set(serverMessages.map(m => m.id));
                    const remainingPending = pendingMsgs.filter(m => !serverMsgIds.has(m._serverMsgId));

                    // Mark server messages with 'sent' status
                    const enrichedServer = serverMessages.map(m => ({
                        ...m,
                        _status: m.is_read ? MSG_STATUS.READ : MSG_STATUS.SENT,
                    }));

                    return [...enrichedServer, ...remainingPending];
                });

                setError(null);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
            if (isInitial) setError('Error cargando mensajes');
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [roomId, isConversation]);

    // Load messages and setup polling
    useEffect(() => {
        if (!roomId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        setMessages([]);
        setLoading(true);
        fetchMessages(true);

        // Poll every 5 seconds with dedup
        pollingRef.current = setInterval(() => fetchMessages(false), 5000);

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [roomId, fetchMessages]);

    // Mark messages as read when conversation opens
    useEffect(() => {
        if (!roomId || !currentUserId || !isConversation) return;

        // Delay slightly so we don't fire before messages load
        const timer = setTimeout(() => {
            fetch('/api/messages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: roomId, userId: currentUserId }),
            }).catch(() => { }); // Silent fail
        }, 1000);

        return () => clearTimeout(timer);
    }, [roomId, currentUserId, isConversation]);

    // Send message with optimistic update
    const sendMessage = async (content, contentType = 'text', fileUrl = null) => {
        if (!currentUserId || (!content?.trim() && !fileUrl)) return;

        const tempId = `temp_${Date.now()}_${++tempIdCounter.current}`;

        // Optimistic message
        const optimisticMsg = {
            id: tempId,
            _tempId: tempId,
            _status: MSG_STATUS.SENDING,
            conversation_id: roomId,
            sender_id: currentUserId,
            content: content?.trim() || '',
            content_type: contentType,
            file_url: fileUrl,
            created_at: new Date().toISOString(),
            sender_name: user?.name || user?.user_metadata?.name || 'Tú',
            sender_avatar: user?.avatar_url || user?.user_metadata?.avatar_url,
        };

        // Add optimistic message immediately
        setMessages(prev => [...prev, optimisticMsg]);
        setSending(true);

        try {
            if (isConversation) {
                const res = await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conversationId: roomId,
                        senderId: currentUserId,
                        content: content?.trim() || '',
                        contentType,
                        fileUrl,
                    }),
                });

                if (res.ok) {
                    const { message } = await res.json();
                    // Replace optimistic message with real one
                    setMessages(prev =>
                        prev.map(m =>
                            m._tempId === tempId
                                ? { ...message, _status: MSG_STATUS.SENT, _serverMsgId: message.id }
                                : m
                        )
                    );
                } else {
                    throw new Error('Send failed');
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
                        mediaUrl: fileUrl,
                    }),
                });

                if (res.ok) {
                    const { message } = await res.json();
                    setMessages(prev =>
                        prev.map(m =>
                            m._tempId === tempId
                                ? { ...message, _status: MSG_STATUS.SENT }
                                : m
                        )
                    );
                } else {
                    throw new Error('Send failed');
                }
            }
        } catch (err) {
            console.error('Error sending message:', err);
            // Mark as failed
            setMessages(prev =>
                prev.map(m =>
                    m._tempId === tempId
                        ? { ...m, _status: MSG_STATUS.FAILED }
                        : m
                )
            );
        } finally {
            setSending(false);
        }
    };

    // Retry a failed message
    const retryMessage = useCallback(async (msgId) => {
        const msg = messagesRef.current.find(m => (m._tempId === msgId || m.id === msgId) && m._status === MSG_STATUS.FAILED);
        if (!msg) return;

        // Remove the failed message and resend
        setMessages(prev => prev.filter(m => m._tempId !== msg._tempId && m.id !== msgId));
        await sendMessage(msg.content, msg.content_type, msg.file_url);
    }, []);

    // Upload file
    const uploadFile = async (file) => {
        try {
            // Use the /api/upload presigned URL flow
            const presignRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type,
                    folder: 'chat-media',
                }),
            });

            if (!presignRes.ok) {
                throw new Error('Failed to get upload URL');
            }

            const { uploadUrl, publicUrl } = await presignRes.json();

            // Upload directly to S3
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });

            if (!uploadRes.ok) {
                throw new Error('Failed to upload file');
            }

            return publicUrl;
        } catch (err) {
            console.error('Error uploading file:', err);
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

    // Real typing indicator — throttled to once per 2s
    const sendTyping = useCallback(() => {
        if (!roomId || !isConversation) return;
        const now = Date.now();
        if (now - lastTypingSentRef.current < 2000) return;
        lastTypingSentRef.current = now;
        setPresenceTyping?.(roomId);
    }, [roomId, isConversation, setPresenceTyping]);

    // Poll partner typing status every 2 seconds
    useEffect(() => {
        if (!roomId || !isConversation || !currentUserId) {
            setIsPartnerTypingState(false);
            return;
        }

        // Find the partner user ID from messages (the other sender)
        const partnerMsg = messagesRef.current.find(m => m.sender_id && m.sender_id !== currentUserId);
        const partnerId = partnerMsg?.sender_id;

        if (!partnerId) return;

        const pollTyping = async () => {
            const typing = await checkTyping?.(partnerId, roomId);
            setIsPartnerTypingState(!!typing);
        };

        pollTyping();
        typingPollRef.current = setInterval(pollTyping, 2000);

        return () => {
            if (typingPollRef.current) clearInterval(typingPollRef.current);
        };
    }, [roomId, isConversation, currentUserId, checkTyping]);

    // Determine if partner is online
    const partnerMsg = messages.find(m => m.sender_id && m.sender_id !== currentUserId);
    const partnerId = partnerMsg?.sender_id;
    const isPartnerOnlineVal = partnerId ? isUserOnline(partnerId) : false;

    return {
        messages,
        loading,
        sending,
        error,
        sendMessage,
        sendImage,
        sendFile,
        uploadFile,
        sendTyping,
        retryMessage,
        pendingCount: messages.filter(m => m._status === MSG_STATUS.SENDING).length,
        isPartnerOnline: isPartnerOnlineVal,
        isPartnerTyping: isPartnerTypingState,
        refreshMessages: fetchMessages,
        isConnected: isLoggedIn,
    };
}

export default useChat;
