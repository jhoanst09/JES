'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getProductsByHandles } from '../services/shopify';
import { useRouter } from 'next/navigation';

/**
 * WishlistContext - Clean Architecture
 * 
 * Manages wishlist, user profile, and social features.
 * Uses new JWT auth system + RDS database.
 */

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
    const [wishlist, setWishlist] = useState([]);
    const [userProfile, setUserProfile] = useState({ name: 'Usuario', avatar: '👤' });
    const [loading, setLoading] = useState(true);
    const [socialLoading, setSocialLoading] = useState({});
    const [friends, setFriends] = useState([]);
    const [following, setFollowing] = useState([]);
    const [followRequests, setFollowRequests] = useState([]);
    const [sentFollowRequests, setSentFollowRequests] = useState([]);
    const [orders, setOrders] = useState([]);

    const { user, isLoggedIn, loading: authLoading, signOut: authSignOut } = useAuth();
    const router = useRouter();

    // ==========================================
    // FETCH USER DATA ON AUTH
    // ==========================================
    useEffect(() => {
        if (authLoading) return;

        if (isLoggedIn && user) {
            fetchUserData();
        } else {
            setWishlist([]);
            setUserProfile({ name: 'Usuario', avatar: '👤' });
            setFriends([]);
            setFollowing([]);
            setFollowRequests([]);
            setSentFollowRequests([]);
            setOrders([]);
            setLoading(false);
        }
    }, [isLoggedIn, user, authLoading]);

    // ==========================================
    // FETCH USER DATA
    // ==========================================
    const fetchUserData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);

        try {
            // Fetch profile
            const profileRes = await fetch(`/api/profile?userId=${user.id}`);
            if (profileRes.ok) {
                const { profile } = await profileRes.json();
                if (profile) {
                    setUserProfile({
                        ...profile,
                        avatar: profile.avatar_url || '🌴',
                    });
                }
            }

            // Fetch wishlist
            const wishlistRes = await fetch(`/api/wishlist?userId=${user.id}`);
            if (wishlistRes.ok) {
                const { items } = await wishlistRes.json();
                if (items?.length > 0) {
                    const handles = items.map(i => i.product_handle);
                    const products = await getProductsByHandles(handles);
                    setWishlist(products);
                }
            }

            // Fetch friends and following
            const friendsRes = await fetch(`/api/friends?userId=${user.id}`);
            if (friendsRes.ok) {
                const { friends: f, requests, following: fol, sentRequests, orders: o } = await friendsRes.json();
                setFriends(f || []);
                setFollowing(fol || []);
                setFollowRequests(requests || []);
                setSentFollowRequests(sentRequests || []);
                setOrders(o || []);
            }

        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // ==========================================
    // WISHLIST ACTIONS
    // ==========================================
    const addToWishlist = useCallback(async (product) => {
        if (!user?.id || !product?.handle) return;

        // Optimistic update
        setWishlist(prev => [...prev, product]);

        try {
            await fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    productHandle: product.handle,
                }),
            });
        } catch (error) {
            // Rollback
            setWishlist(prev => prev.filter(p => p.handle !== product.handle));
        }
    }, [user?.id]);

    const removeFromWishlist = useCallback(async (productHandle) => {
        if (!user?.id) return;

        // Optimistic update
        const prev = wishlist;
        setWishlist(curr => curr.filter(p => p.handle !== productHandle));

        try {
            await fetch('/api/wishlist', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    productHandle,
                }),
            });
        } catch (error) {
            // Rollback
            setWishlist(prev);
        }
    }, [user?.id, wishlist]);

    const isInWishlist = useCallback((handle) => {
        return (wishlist || []).some(p => p.handle === handle);
    }, [wishlist]);

    // ==========================================
    // PROFILE ACTIONS
    // ==========================================
    const updateProfile = useCallback(async (updates) => {
        if (!user?.id) return;

        // Optimistic update
        const prevProfile = userProfile;
        setUserProfile(prev => ({ ...prev, ...updates }));

        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, ...updates }),
            });

            if (!res.ok) throw new Error('Failed to update');
        } catch (error) {
            setUserProfile(prevProfile);
            throw error;
        }
    }, [user?.id, userProfile]);

    // ==========================================
    // FRIEND ACTIONS
    // ==========================================
    const sendFriendRequest = useCallback(async (friendId) => {
        if (!user?.id) return;

        try {
            await fetch('/api/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, friendId }),
            });
        } catch (error) {
            console.error('Error sending friend request:', error);
        }
    }, [user?.id]);

    const acceptFriendRequest = useCallback(async (requestId) => {
        try {
            await fetch('/api/friends/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId }),
            });
            await fetchUserData();
        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    }, [fetchUserData]);

    const toggleFollow = useCallback(async (targetUserId) => {
        if (!user?.id) return;
        setSocialLoading(prev => ({ ...prev, [targetUserId]: true }));
        try {
            const res = await fetch('/api/friends/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, targetUserId }),
            });
            if (res.ok) {
                await fetchUserData();
            }
        } catch (error) {
            console.error('Error toggle follow:', error);
        } finally {
            setSocialLoading(prev => ({ ...prev, [targetUserId]: false }));
        }
    }, [user?.id, fetchUserData]);

    const logout = useCallback(async () => {
        // Clear all local states first
        setWishlist([]);
        setUserProfile({ name: 'Usuario', avatar: '👤' });
        setFriends([]);
        setFollowing([]);
        setFollowRequests([]);
        setSentFollowRequests([]);
        setOrders([]);

        // Call auth logout which will handle the redirect
        await authSignOut();
    }, [authSignOut]);

    return (
        <WishlistContext.Provider value={{
            // State
            wishlist,
            userProfile,
            loading: loading || authLoading,
            isLoggedIn,
            session: user ? { user } : null,
            friends,
            following,
            followRequests,
            sentFollowRequests,
            socialLoading,
            orders,

            // Wishlist
            addToWishlist,
            removeFromWishlist,
            isInWishlist,

            // Profile
            updateProfile,
            refreshProfile: fetchUserData,

            // Friends
            sendFriendRequest,
            acceptFriendRequest,
            toggleFollow,
            logout,
        }}>
            {children}
        </WishlistContext.Provider>
    );
}

// SSR-safe defaults for when context is unavailable during prerender
const defaultWishlistContext = {
    wishlist: [],
    session: null,
    userProfile: { name: 'Usuario', avatar: '👤' },
    isLoggedIn: false,
    loading: false,
    socialLoading: false,
    friends: [],
    following: [],
    sentFollowRequests: [],
    toggleFollow: () => { },
    followRequests: [],
    unreadMessages: 0,
    orders: [],
    addToWishlist: () => { },
    removeFromWishlist: () => { },
    toggleWishlist: () => { },
    isInWishlist: () => false,
    updateProfile: () => { },
    refreshProfile: () => { },
    sendFriendRequest: () => { },
    acceptFriendRequest: () => { },
    rejectFollowRequest: () => { },
    login: () => { },
    signUp: () => { },
    loginWithGoogle: () => { },
    resetPassword: () => { },
    logout: () => { },
    togglePrivacy: () => { },
};

export function useWishlist() {
    const context = useContext(WishlistContext);
    return context || defaultWishlistContext;
}

export default WishlistContext;
