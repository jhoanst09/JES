/**
 * Chat Actions Service
 * 
 * Client-side service for chat operations.
 * Calls API routes instead of direct Supabase.
 */

export async function getOrCreateConversation(userId, friendId) {
    const res = await fetch('/api/chat/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, friendId }),
    });
    if (!res.ok) throw new Error('Failed to get conversation');
    const { conversation } = await res.json();
    return conversation;
}

export async function sendMessage(conversationId, senderId, content, type = 'text', mediaUrl = null) {
    const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, senderId, content, type, mediaUrl }),
    });
    if (!res.ok) throw new Error('Failed to send message');
    const { message } = await res.json();
    return message;
}

export async function getMessages(conversationId, limit = 50, before = null) {
    const params = new URLSearchParams({ conversationId, limit });
    if (before) params.append('before', before);

    const res = await fetch(`/api/chat/messages?${params}`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    const { messages } = await res.json();
    return messages || [];
}

export async function markAsRead(conversationId, userId) {
    await fetch('/api/chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, userId }),
    });
}

export async function getUnreadCount(userId) {
    const res = await fetch(`/api/chat/unread?userId=${userId}`);
    if (!res.ok) return 0;
    const { count } = await res.json();
    return count || 0;
}

export async function uploadChatMedia(file, folder = 'chat') {
    // Use S3 upload
    const { uploadToS3 } = await import('../utils/s3');
    return uploadToS3(file, folder);
}

export async function getConversations(userId) {
    const res = await fetch(`/api/chat/conversations?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    const { conversations } = await res.json();
    return conversations || [];
}

export async function deleteMessage(messageId) {
    await fetch(`/api/chat/message/${messageId}`, { method: 'DELETE' });
}
