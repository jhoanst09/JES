import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { getProductsByHandles } from '../services/shopify';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
    const isFetchingRef = useRef(false);
    const [wishlist, setWishlist] = useState([]);
    const [userProfile, setUserProfile] = useState({ name: 'Usuario', avatar: '👤', bio: '', avatar_url: null });
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [socialLoading, setSocialLoading] = useState({}); // { [userId]: boolean }
    const [following, setFollowing] = useState([]);
    const [followRequests, setFollowRequests] = useState([]);
    const [sentFollowRequests, setSentFollowRequests] = useState([]);
    const [orders, setOrders] = useState([]);
    const [friends, setFriends] = useState([]);

    // Initial Auth listener
    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            // Safety timeout - ensure loading never stays stuck
            const loadingTimeout = setTimeout(() => {
                if (isMounted) {
                    console.warn('⚠️ Auth loading timeout - forcing completion');
                    setLoading(false);
                }
            }, 5000);

            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                if (!isMounted) return;

                console.log('🔐 Initial session:', initialSession ? 'found' : 'none');

                setSession(initialSession);
                setIsLoggedIn(!!initialSession);

                if (initialSession) {
                    await fetchUserData(initialSession.user);
                }
            } catch (err) {
                console.error('Error during initial auth check:', err);
            } finally {
                clearTimeout(loadingTimeout);
                if (isMounted) setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            if (!isMounted) return;

            console.log('🔄 Auth state changed:', newSession ? 'logged in' : 'logged out');

            setSession(newSession);
            setIsLoggedIn(!!newSession);

            if (newSession) {
                await fetchUserData(newSession.user);
            } else {
                setWishlist([]);
                setUserProfile({ name: 'Usuario', avatar: '👤', bio: '' });
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!isLoggedIn || !session?.user?.id) return;

        // Real-time listener for friendships
        const channel = supabase
            .channel('realtime:friendships')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'friendships'
            }, async (payload) => {
                console.log('Friendship change detected:', payload);
                const { user_id, friend_id } = payload.new || payload.old || {};

                // If the user is involved in this friendship change, refresh
                if (user_id === session.user.id || friend_id === session.user.id) {
                    console.log('Relevant friendship change for current user, refreshing...');
                    await fetchUserData(session.user);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isLoggedIn, session?.user?.id]);

    async function fetchUserData(user) {
        if (!user || isFetchingRef.current) return;

        isFetchingRef.current = true;
        if (!isLoggedIn) setLoading(true);

        try {
            // 1. Fetch Profile First
            const { data: pData, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (pError) console.warn('Error fetching profile:', pError);

            if (pData) {
                setUserProfile({
                    ...pData,
                    id: pData.id, // Explicitly ensure ID is here
                    avatar: pData.avatar_url || '🌴',
                    bio: pData.bio || ''
                });
            } else {
                // ... logic to create profile if it doesn't exist
                const newProfile = {
                    id: user.id,
                    name: user.email?.split('@')[0] || 'Usuario',
                    avatar_url: null,
                    bio: '',
                    updated_at: new Date().toISOString()
                };
                const { data: created, error: iError } = await supabase.from('profiles').insert(newProfile).select().maybeSingle();
                if (iError) console.error('Error creating profile:', iError);
                if (created) {
                    setUserProfile({
                        ...created,
                        id: created.id,
                        avatar: '🌴',
                        bio: ''
                    });
                } else {
                    // Fallback if insert failed but we have a user
                    setUserProfile({
                        id: user.id,
                        name: user.email?.split('@')[0] || 'Usuario',
                        avatar: '👤',
                        bio: ''
                    });
                }
            }

            // 2. Fetch the rest in parallel
            await Promise.allSettled([
                fetchWishlist(user.id),
                fetchFriendships(user.id),
                fetchOrders(user.id)
            ]);

        } catch (err) {
            console.error('Error hydrating user data:', err);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    }

    async function fetchWishlist(userId) {
        try {
            const { data: items, error: wError } = await supabase
                .from('wishlist_items')
                .select('*')
                .eq('user_id', userId);

            if (wError) throw wError;

            if (items && items.length > 0) {
                const handles = [...new Set(items.map(i => i.product_handle))].filter(Boolean);
                try {
                    const products = await getProductsByHandles(handles);
                    const enriched = items.map(dbItem => {
                        const shopifyProduct = products.find(p => p.handle === dbItem.product_handle);
                        return shopifyProduct
                            ? { ...shopifyProduct, isPrivate: dbItem.is_private, db_id: dbItem.id }
                            : { id: `missing-${dbItem.product_handle}`, handle: dbItem.product_handle, title: `Producto no disponible`, price: '---', isPrivate: dbItem.is_private, db_id: dbItem.id };
                    });
                    setWishlist(enriched);
                } catch (err) {
                    console.error('Shopify fetch error:', err);
                }
            } else {
                setWishlist([]);
            }
        } catch (err) {
            if (err.code === 'PGRST116' || err.status === 404) {
                console.warn('Tabla wishlist_items no encontrada.');
            } else {
                console.error('Error fetching wishlist:', err);
            }
        }
    }

    async function fetchFriendships(userId) {
        try {
            const { data: relationshipData, error: fError } = await supabase
                .from('friendships')
                .select('*')
                .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

            if (fError) throw fError;

            if (relationshipData) {
                const accepted = relationshipData.filter(r => r.status === 'accepted');
                const friendIds = accepted.map(f => f.user_id === userId ? f.friend_id : f.user_id);
                setFollowing(friendIds);

                if (friendIds.length > 0) {
                    const { data: fullFriendProfiles } = await supabase.from('profiles').select('*').in('id', friendIds);
                    if (fullFriendProfiles) setFriends(fullFriendProfiles);
                }

                const incoming = relationshipData.filter(r => r.friend_id === userId && r.status === 'pending');
                setFollowRequests(incoming);

                const outgoing = relationshipData.filter(r => r.user_id === userId && r.status === 'pending');
                setSentFollowRequests(outgoing.map(r => r.friend_id));
            }
        } catch (err) {
            console.warn('Error fetching friendships (check if table exists):', err.message);
        }
    }

    async function fetchOrders(userId) {
        try {
            const { data: oData, error: oError } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (oError) throw oError;
            if (oData) setOrders(oData);
        } catch (err) {
            console.warn('Error fetching orders (check if table exists):', err.message);
        }
    }

    const login = async ({ email, password }) => {
        if (password) {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase.auth.signInWithOtp({ email });
            if (error) throw error;
            return data;
        }
    };

    const signUp = async ({ email, password }) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: email.split('@')[0]
                },
                emailRedirectTo: window.location.origin + '/profile'
            }
        });

        if (error) {
            if (error.message.includes('already registered')) {
                throw new Error('Este correo ya está registrado. Intenta iniciar sesión.');
            }
            throw error;
        }

        // Manual check for session if email confirmation is disabled/enabled
        if (data.user && !data.session) {
            // This happens when email confirmation is enabled in Supabase
            return { ...data, needsConfirmation: true };
        }

        return data;
    };

    const loginWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/profile'
            }
        });
        if (error) throw error;
    };

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/profile'
        });
        if (error) throw error;
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    const addToWishlist = async (product, isPrivate = false) => {
        if (!isLoggedIn) return;

        // Optimistic UI
        setWishlist(prev => [...prev, { ...product, isPrivate }]);

        const { error } = await supabase
            .from('wishlist_items')
            .insert({
                user_id: session.user.id,
                product_handle: product.handle,
                is_private: isPrivate
            });

        if (error) {
            console.error('Error adding to DB:', error);
            alert(`¡Erda! No pudimos guardar el deseo: ${error.message}`);
            // Rollback
            setWishlist(prev => prev.filter(p => p.handle !== product.handle));
        }
    };

    const removeFromWishlist = async (productId) => {
        if (!isLoggedIn) return;

        console.log('Attempting to remove product:', productId);
        const product = wishlist.find(p => p.id === productId || p.db_id === productId);
        if (!product) {
            console.error('Product not found in local wishlist state');
            return;
        }

        // Optimistic UI
        setWishlist(prev => prev.filter(p => p.id !== product.id && p.db_id !== product.db_id));

        const { error } = await supabase
            .from('wishlist_items')
            .delete()
            .eq('user_id', session.user.id)
            .eq('product_handle', product.handle);

        if (error) {
            console.error('Error removing from DB:', error);
            // Rollback if needed
            fetchUserData(session.user);
        } else {
            console.log('Successfully removed from DB');
        }
    };

    const sendFollowRequest = async (targetUserId) => {
        if (!isLoggedIn) return;

        // Check if already following
        if (following.includes(targetUserId)) return;

        const { error } = await supabase
            .from('friendships')
            .insert({
                user_id: session.user.id,
                friend_id: targetUserId,
                status: 'pending'
            });

        if (error) {
            console.error('CRITICAL: Error sending friend request:', error);
            alert(`No se pudo enviar la solicitud: ${error.message}`);
        } else {
            console.log('Friend request sent successfully to:', targetUserId);
            setSentFollowRequests(prev => [...prev, targetUserId]);
            alert('¡Listo! Solicitud de amistad enviada. ⌛');
        }
    };

    const acceptFollowRequest = async (requestId, senderId) => {
        if (!isLoggedIn) return;

        // Update friendships status to 'accepted'
        const { error: fError } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', requestId);

        if (fError) {
            console.error('Error accepting friend request:', fError);
            alert('Error al aceptar la solicitud.');
            return;
        }

        // Update local state
        setFollowRequests(prev => prev.filter(r => r.id !== requestId));
        setFollowing(prev => [...prev, senderId]);
        alert('¡Solicitud aceptada! Ahora son amigos. ✓');
    };

    const rejectFollowRequest = async (requestId) => {
        if (!isLoggedIn) return;

        await supabase
            .from('friendships')
            .delete()
            .eq('id', requestId);

        setFollowRequests(prev => prev.filter(r => r.id !== requestId));
        alert('Solicitud rechazada.');
    };

    const toggleFollow = async (friendId) => {
        if (!isLoggedIn) {
            alert('¡Hola! Debes iniciar sesión para añadir amigos. 💡');
            return;
        }
        if (!session?.user?.id) return;

        setSocialLoading(prev => ({ ...prev, [friendId]: true }));
        try {
            const isFollowing = following.includes(friendId);

            if (isFollowing) {
                // Unfriend
                if (window.confirm('¿Quieres eliminar a este amigo?')) {
                    setFollowing(prev => prev.filter(id => id !== friendId));
                    await supabase
                        .from('friendships')
                        .delete()
                        .or(`and(user_id.eq.${session.user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${session.user.id})`);

                    fetchUserData(session.user);
                }
                // Check if there is already a pending request
                const { data: existing, error: selectError } = await supabase
                    .from('friendships')
                    .select('*')
                    .or(`and(user_id.eq.${session.user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${session.user.id})`)
                    .maybeSingle();

                if (selectError) {
                    console.error('Error checking existing friendship:', selectError);
                }

                if (existing) {
                    if (existing.status === 'pending') {
                        if (existing.user_id === session.user.id) {
                            alert('Ya enviaste una solicitud. ¡Pronto recibirá noticias!');
                        } else {
                            alert('Este usuario ya te envió una solicitud. Búscala en tu perfil.');
                        }
                    } else if (existing.status === 'accepted') {
                        await fetchUserData(session.user);
                    }
                    return;
                }

                console.log('Sending new friend request to:', friendId);
                await sendFollowRequest(friendId);
            }
        } catch (err) {
            console.error('Error in toggleFollow:', err);
            alert('Vaya, algo salió mal al intentar seguir a este usuario.');
        } finally {
            setSocialLoading(prev => ({ ...prev, [friendId]: false }));
        }
    };

    const togglePrivacy = async (productId) => {
        if (!isLoggedIn) return;

        console.log('Toggling privacy for:', productId);
        const product = wishlist.find(p => p.id === productId || p.db_id === productId);
        if (!product) {
            console.error('Product not found for privacy toggle');
            return;
        }

        const newPrivate = !product.isPrivate;

        // Optimistic UI
        setWishlist(prev => prev.map(p =>
            p.id === productId ? { ...p, isPrivate: newPrivate } : p
        ));

        const { error } = await supabase
            .from('wishlist_items')
            .update({ is_private: newPrivate })
            .eq('user_id', session.user.id)
            .eq('product_handle', product.handle);

        if (error) console.error('Error updating privacy in DB:', error);
    };

    const toggleWishlist = (product) => {
        if (wishlist.find(p => p.id === product.id)) {
            removeFromWishlist(product.id);
        } else {
            addToWishlist(product);
        }
    };

    const isInWishlist = (productId) => {
        return !!wishlist.find(p => p.id === productId);
    };

    const isPrivate = (productId) => {
        return wishlist.find(p => p.id === productId)?.isPrivate || false;
    };

    const updateProfile = async (updates) => {
        if (!isLoggedIn) return;

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', session.user.id);

        if (!error) {
            setUserProfile(prev => ({ ...prev, ...updates }));
        }
    };

    const placeOrder = async (product) => {
        if (!isLoggedIn) return;

        const { error } = await supabase
            .from('orders')
            .insert({
                user_id: session.user.id,
                product_handle: product.handle,
                product_title: product.nombre || product.title,
                price: product.precio || product.price,
                status: 'completado',
                created_at: new Date().toISOString()
            });

        if (!error) {
            // Refresh orders
            const { data: userOrders } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });
            if (userOrders) setOrders(userOrders);
        } else {
            console.error('Error placing order:', error);
        }
    };

    return (
        <WishlistContext.Provider value={{
            wishlist,
            addToWishlist,
            removeFromWishlist,
            toggleWishlist,
            isInWishlist,
            togglePrivacy,
            userProfile,
            updateProfile,
            toggleFollow,
            following,
            friends,
            orders,
            placeOrder,
            isLoggedIn,
            loading,
            socialLoading,
            login,
            signUp,
            loginWithGoogle,
            resetPassword,
            logout,
            followRequests,
            sentFollowRequests,
            sendFollowRequest,
            acceptFollowRequest,
            rejectFollowRequest
        }}>
            {children}
        </WishlistContext.Provider>
    );
}

export const useWishlist = () => useContext(WishlistContext);
