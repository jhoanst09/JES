import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getProductsByHandles } from '../services/shopify';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
    const [wishlist, setWishlist] = useState([]);
    const [userProfile, setUserProfile] = useState({ name: 'Usuario', avatar: '👤', bio: '', avatar_url: null });
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState([]);
    const [followRequests, setFollowRequests] = useState([]);
    const [sentFollowRequests, setSentFollowRequests] = useState([]);
    const [orders, setOrders] = useState([]);
    const [friends, setFriends] = useState([]);

    // Initial Auth listener
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsLoggedIn(!!session);
            if (session) fetchUserData(session.user);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setIsLoggedIn(!!session);
            if (session) {
                fetchUserData(session.user);
            } else {
                setWishlist([]);
                setUserProfile({ name: 'Usuario', avatar: '👤', bio: '' });
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!isLoggedIn || !session?.user?.id) return;

        // Real-time listener for follow requests
        const channel = supabase
            .channel(`realtime:follow_requests:${session.user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'follow_requests',
                filter: `receiver_id=eq.${session.user.id}`
            }, async (payload) => {
                console.log('New follow request received:', payload);
                // Fetch sender name
                const { data: sender } = await supabase
                    .from('profiles')
                    .select('name')
                    .eq('id', payload.new.sender_id)
                    .single();

                alert(`🔔 ¡Hola! ${sender?.name || 'Un usuario'} te envió una solicitud de amistad. Mírala en tu perfil.`);
                fetchUserData(session.user);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isLoggedIn, session?.user?.id]);

    async function fetchUserData(user) {
        if (!user) return;
        setLoading(true);

        let profile = null;
        let items = [];
        let follows = [];
        let requests = [];
        let userOrders = [];

        try {
            // 1. Fetch Profile
            const { data: pData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (pData) {
                profile = pData;
                setUserProfile({
                    ...profile,
                    avatar: profile.avatar_url || '🌴',
                    bio: profile.bio || ''
                });
            } else {
                const newProfile = {
                    id: user.id,
                    name: user.email.split('@')[0],
                    avatar_url: null,
                    bio: '',
                    updated_at: new Date().toISOString()
                };
                const { data: created } = await supabase.from('profiles').insert(newProfile).select().maybeSingle();
                if (created) setUserProfile({ ...created, avatar: '🌴' });
            }

            // 2. Fetch Wishlist Items
            const { data: wData } = await supabase
                .from('wishlist_items')
                .select('*')
                .eq('user_id', user.id);

            if (wData) {
                items = wData;
                console.log('Wishlist items from DB:', items);
                const handles = items.map(i => i.product_handle);
                try {
                    const products = await getProductsByHandles(handles);
                    console.log('Products fetched from Shopify:', products);

                    const enriched = items.map(dbItem => {
                        const shopifyProduct = products.find(p => p.handle === dbItem.product_handle);
                        if (shopifyProduct) {
                            return { ...shopifyProduct, isPrivate: dbItem.is_private, db_id: dbItem.id };
                        }
                        // Fallback placeholder if Shopify product not found
                        return {
                            id: `missing-${dbItem.product_handle}`,
                            handle: dbItem.product_handle,
                            title: `Producto no disponible (${dbItem.product_handle})`,
                            image: null,
                            price: '---',
                            isPrivate: dbItem.is_private,
                            db_id: dbItem.id
                        };
                    });
                    setWishlist(enriched);
                } catch (shopifyErr) {
                    console.error('Error enriching wishlist with Shopify:', shopifyErr);
                    // Just set empty or map logic above
                }
            }

            // 3. Fetch Following
            const { data: fData } = await supabase
                .from('friends')
                .select('friend_id')
                .eq('user_id', user.id);

            if (fData) {
                follows = fData;
                setFollowing(follows.map(f => f.friend_id));

                // Fetch full friend profiles for the gift modal
                const friendIds = follows.map(f => f.friend_id);
                if (friendIds.length > 0) {
                    const { data: friendProfiles } = await supabase
                        .from('profiles')
                        .select('*')
                        .in('id', friendIds);
                    if (friendProfiles) {
                        setFriends(friendProfiles);
                    }
                }
            }

            // 4. Fetch Orders
            const { data: oData } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (oData) {
                userOrders = oData;
                setOrders(userOrders);
            }

            // 5. Fetch Follow Requests (incoming)
            const { data: rData } = await supabase
                .from('follow_requests')
                .select('*, profiles:sender_id(*)')
                .eq('receiver_id', user.id)
                .eq('status', 'pending');

            if (rData) {
                setFollowRequests(rData);
            }

            // 6. Fetch Sent Follow Requests
            const { data: sRData } = await supabase
                .from('follow_requests')
                .select('receiver_id')
                .eq('sender_id', user.id)
                .eq('status', 'pending');

            if (sRData) {
                setSentFollowRequests(sRData.map(r => r.receiver_id));
            }
        } catch (err) {
            console.error('Error hydrating user data:', err);
        } finally {
            setLoading(false);
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
            .from('follow_requests')
            .insert({
                sender_id: session.user.id,
                receiver_id: targetUserId,
                status: 'pending'
            });

        if (error) {
            console.error('Error sending friend request:', error);
            // Fallback for demo: just follow directly if table missing
            toggleFollow(targetUserId);
        } else {
            setSentFollowRequests(prev => [...prev, targetUserId]);
            alert('¡Listo! Solicitud de amistad enviada. ⌛');
        }
    };

    const acceptFollowRequest = async (requestId, senderId) => {
        if (!isLoggedIn) return;

        // 1. Add to friends
        const { error: fError } = await supabase
            .from('friends')
            .insert({ user_id: session.user.id, friend_id: senderId });

        if (fError) {
            console.error('Error accepting follow request:', fError);
            return;
        }

        // 2. Update request status
        await supabase
            .from('follow_requests')
            .delete()
            .eq('id', requestId);

        // Update local state
        setFollowRequests(prev => prev.filter(r => r.id !== requestId));
        setFollowing(prev => [...prev, senderId]);
    };

    const rejectFollowRequest = async (requestId) => {
        if (!isLoggedIn) return;

        await supabase
            .from('follow_requests')
            .delete()
            .eq('id', requestId);

        setFollowRequests(prev => prev.filter(r => r.id !== requestId));
    };

    const toggleFollow = async (friendId) => {
        if (!isLoggedIn) return;

        const isFollowing = following.includes(friendId);

        if (isFollowing) {
            setFollowing(prev => prev.filter(id => id !== friendId));
            await supabase.from('friends').delete().eq('user_id', session.user.id).eq('friend_id', friendId);
        } else {
            // Check if there is already a pending request
            const { data: existing } = await supabase
                .from('follow_requests')
                .select('*')
                .eq('sender_id', session.user.id)
                .eq('receiver_id', friendId)
                .maybeSingle();

            if (existing) {
                alert('Ya enviaste una solicitud de amistad. ¡Pronto recibirás noticias!');
                return;
            }

            await sendFollowRequest(friendId);
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
