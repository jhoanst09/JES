/**
 * useFriends Hook
 * 
 * Hook for managing friends and friend requests.
 * Uses API routes instead of direct Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export function useFriends() {
    const { user, isLoggedIn } = useAuth();
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch friends data
    const fetchFriends = useCallback(async () => {
        if (!user?.id) return;

        try {
            const res = await fetch(`/api/friends?userId=${user.id}`);
            if (res.ok) {
                const { friends, requests } = await res.json();
                setFriends(friends || []);
                setPendingRequests(requests || []);
            }
        } catch (error) {
            console.error('Error fetching friends:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (isLoggedIn && user?.id) {
            fetchFriends();
        }
    }, [isLoggedIn, user?.id, fetchFriends]);

    // Send friend request
    const sendFriendRequest = async (friendId) => {
        if (!user?.id) return;

        try {
            await fetch('/api/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, friendId }),
            });
            await fetchFriends();
        } catch (error) {
            console.error('Error sending friend request:', error);
        }
    };

    // Accept friend request
    const acceptFriendRequest = async (requestId) => {
        try {
            await fetch('/api/friends/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId }),
            });
            await fetchFriends();
        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    };

    // Decline friend request
    const declineFriendRequest = async (requestId) => {
        try {
            await fetch('/api/friends/decline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId }),
            });
            await fetchFriends();
        } catch (error) {
            console.error('Error declining friend request:', error);
        }
    };

    // Remove friend
    const removeFriend = async (friendId) => {
        if (!user?.id) return;

        try {
            await fetch('/api/friends/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, friendId }),
            });
            await fetchFriends();
        } catch (error) {
            console.error('Error removing friend:', error);
        }
    };

    // Check if user is friend
    const isFriend = (userId) => {
        return friends.some(f => f.id === userId);
    };

    // Check if request pending
    const hasPendingRequest = (userId) => {
        return pendingRequests.some(r => r.user_id === userId) ||
            sentRequests.some(r => r.friend_id === userId);
    };

    return {
        friends,
        pendingRequests,
        sentRequests,
        loading,
        sendFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        removeFriend,
        isFriend,
        hasPendingRequest,
        refreshFriends: fetchFriends,
    };
}

export default useFriends;
