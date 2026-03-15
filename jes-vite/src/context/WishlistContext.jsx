'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getProductsByHandles } from '../services/jescore';
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

    const { user, isLoggedIn, loading: authLoading, signOut: authSignOut, login: authLogin, register: authRegister } = useAuth();
    const { showToast } = useToast();
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
            const profileRes = await fetch(`/api/profile?userId=${user.id}&self=true`);
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

                    // Build a map of flags from DB items
                    const flagsMap = {};
                    items.forEach(i => {
                        flagsMap[i.product_handle] = {
                            isLiked: i.is_liked || false,
                            isPrivate: i.is_private || false,
                        };
                    });

                    // Merge flags into the product data
                    const mergedProducts = products.map(p => ({
                        ...p,
                        isLiked: flagsMap[p.handle]?.isLiked || false,
                        isPrivate: flagsMap[p.handle]?.isPrivate || false,
                        is_private: flagsMap[p.handle]?.isPrivate || false,
                    }));

                    setWishlist(mergedProducts);
                } else {
                    setWishlist([]);
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
    // WISHLIST ACTIONS (Dual-flag: isLiked + isPrivate)
    // ==========================================

    // Check if item is LIKED (public favorites — heart icon)
    const isInWishlist = useCallback((handle) => {
        return (wishlist || []).some(p => p.handle === handle && p.isLiked);
    }, [wishlist]);

    // Check if item is PRIVATE (bookmark icon)
    const isItemPrivate = useCallback((handle) => {
        return (wishlist || []).some(p => p.handle === handle && p.isPrivate);
    }, [wishlist]);

    // Toggle LIKED status (heart icon) — never touches isPrivate
    const toggleWishlist = useCallback(async (product) => {
        if (!user?.id) {
            showToast('Inicia sesión para usar favoritos', 'info');
            return;
        }
        const handle = product?.handle;
        if (!handle) return;

        const existsInArray = (wishlist || []).some(p => p.handle === handle);
        const currentlyLiked = isInWishlist(handle);
        const newLiked = !currentlyLiked;

        // Optimistic update
        if (existsInArray) {
            setWishlist(prev => prev.map(p =>
                p.handle === handle ? { ...p, isLiked: newLiked } : p
            ));
        } else {
            // New entry: liked=true, private stays false
            setWishlist(prev => [...prev, { ...product, isLiked: true, isPrivate: false }]);
        }

        showToast(newLiked ? 'Añadido a favoritos ❤️' : 'Eliminado de favoritos', newLiked ? 'success' : 'info');

        try {
            await fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, productHandle: handle, isLiked: newLiked }),
            });

            // If both flags are now false, remove from local state too
            if (!newLiked) {
                setWishlist(prev => {
                    const item = prev.find(p => p.handle === handle);
                    if (item && !item.isPrivate) {
                        return prev.filter(p => p.handle !== handle);
                    }
                    return prev;
                });
            }
        } catch {
            // Rollback
            if (existsInArray) {
                setWishlist(prev => prev.map(p =>
                    p.handle === handle ? { ...p, isLiked: currentlyLiked } : p
                ));
            } else {
                setWishlist(prev => prev.filter(p => p.handle !== handle));
            }
            showToast('Error al actualizar', 'error');
        }
    }, [user?.id, wishlist, isInWishlist, showToast]);

    // Toggle PRIVATE status (bookmark icon) — never touches isLiked
    const togglePrivate = useCallback(async (product) => {
        if (!user?.id) {
            showToast('Inicia sesión para guardar en privados', 'info');
            return;
        }
        const handle = product?.handle;
        if (!handle) return;

        const existsInArray = (wishlist || []).some(p => p.handle === handle);
        const currentlyPrivate = isItemPrivate(handle);
        const newPrivate = !currentlyPrivate;

        // Optimistic update
        if (existsInArray) {
            setWishlist(prev => prev.map(p =>
                p.handle === handle ? { ...p, isPrivate: newPrivate, is_private: newPrivate } : p
            ));
        } else {
            // New entry: private=true, liked stays false
            setWishlist(prev => [...prev, { ...product, isLiked: false, isPrivate: true, is_private: true }]);
        }

        showToast(newPrivate ? 'Guardado en privados 🔒' : 'Removido de privados', newPrivate ? 'success' : 'info');

        try {
            await fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, productHandle: handle, isPrivate: newPrivate }),
            });

            // If both flags are now false, remove from local state too
            if (!newPrivate) {
                setWishlist(prev => {
                    const item = prev.find(p => p.handle === handle);
                    if (item && !item.isLiked) {
                        return prev.filter(p => p.handle !== handle);
                    }
                    return prev;
                });
            }
        } catch {
            // Rollback
            if (existsInArray) {
                setWishlist(prev => prev.map(p =>
                    p.handle === handle ? { ...p, isPrivate: currentlyPrivate, is_private: currentlyPrivate } : p
                ));
            } else {
                setWishlist(prev => prev.filter(p => p.handle !== handle));
            }
            showToast('Error al guardar', 'error');
        }
    }, [user?.id, wishlist, isItemPrivate, showToast]);

    // Remove from wishlist entirely (trash button)
    const removeFromWishlist = useCallback(async (productHandle) => {
        if (!user?.id) return;

        const prev = wishlist;
        setWishlist(curr => curr.filter(p => p.handle !== productHandle));
        showToast('Eliminado de favoritos', 'info');

        try {
            await fetch('/api/wishlist', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, productHandle }),
            });
        } catch {
            setWishlist(prev);
            showToast('Error al eliminar', 'error');
        }
    }, [user?.id, wishlist, showToast]);

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
        if (!user?.id) {
            showToast('Inicia sesión para añadir amigos', 'info');
            return;
        }

        try {
            await fetch('/api/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, friendId }),
            });
            showToast('Solicitud de amistad enviada 🤝', 'success');
            setSentFollowRequests(prev => [...prev, friendId]);
        } catch (error) {
            console.error('Error sending friend request:', error);
            showToast('Error al enviar solicitud', 'error');
        }
    }, [user?.id, showToast]);

    const acceptFriendRequest = useCallback(async (requestId) => {
        try {
            await fetch('/api/friends/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId }),
            });
            showToast('Solicitud aceptada ✅', 'success');
            await fetchUserData();
        } catch (error) {
            console.error('Error accepting friend request:', error);
            showToast('Error al aceptar solicitud', 'error');
        }
    }, [fetchUserData, showToast]);

    const rejectFriendRequest = useCallback(async (requestId) => {
        try {
            await fetch('/api/friends/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId }),
            });
            showToast('Solicitud rechazada', 'info');
            await fetchUserData();
        } catch (error) {
            console.error('Error rejecting friend request:', error);
            showToast('Error al rechazar solicitud', 'error');
        }
    }, [fetchUserData, showToast]);

    const toggleFollow = useCallback(async (targetUserId) => {
        if (!user?.id) {
            showToast('Inicia sesión para añadir amigos', 'info');
            return;
        }
        setSocialLoading(prev => ({ ...prev, [targetUserId]: true }));
        try {
            const res = await fetch('/api/friends/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, targetUserId }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.action === 'requested') {
                    showToast('Solicitud de amistad enviada 🤝', 'success');
                    setSentFollowRequests(prev => [...prev, targetUserId]);
                } else if (data.action === 'unfollowed') {
                    showToast('Amistad eliminada', 'info');
                    setFollowing(prev => prev.filter(id => id !== targetUserId));
                }
                await fetchUserData();
            } else {
                showToast('Error al procesar solicitud', 'error');
            }
        } catch (error) {
            console.error('Error toggle follow:', error);
            showToast('Error de conexión', 'error');
        } finally {
            setSocialLoading(prev => ({ ...prev, [targetUserId]: false }));
        }
    }, [user?.id, fetchUserData, showToast]);

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

    const signUp = useCallback(async ({ email, password, username }) => {
        return await authRegister({ email, password, username });
    }, [authRegister]);

    const resetPassword = useCallback(async () => {
        // Placeholder - not yet implemented with JWT auth
        throw new Error('Funcionalidad no disponible aún. Contacta soporte.');
    }, []);

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
            removeFromWishlist,
            isInWishlist,
            toggleWishlist,
            isItemPrivate,
            togglePrivate,
            togglePrivacy: togglePrivate, // alias for profile page

            // Profile
            updateProfile,
            refreshProfile: fetchUserData,

            // Friends
            sendFriendRequest,
            acceptFriendRequest,
            rejectFriendRequest,
            toggleFollow,
            login: authLogin,
            signUp,
            resetPassword,
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
    removeFromWishlist: () => { },
    toggleWishlist: () => { },
    isInWishlist: () => false,
    isItemPrivate: () => false,
    togglePrivate: () => { },
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
