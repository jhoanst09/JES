import { useRef, useEffect, memo, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { uploadToCloudinary } from '../services/cloudinary';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useWishlist } from '../context/WishlistContext';
import { Link } from 'react-router-dom';

// Memoized Post Component for performance
const PostCard = memo(function PostCard({
    post,
    toggleLike,
    commentingOn,
    setCommentingOn,
    commentInput,
    setCommentInput,
    handleComment,
    comments,
    loadingComments
}) {
    return (
        <div className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-[40px] overflow-hidden shadow-xl transition-transform duration-300">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <Link to={`/wishlist?user=${post.userId || ''}`} className="flex gap-4 group/avatar">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-transparent group-hover/avatar:border-blue-500 transition-all">
                            <img
                                src={post.avatar}
                                className="w-full h-full object-cover"
                                alt=""
                                loading="lazy"
                                decoding="async"
                            />
                        </div>
                        <div>
                            <h4 className="font-black text-zinc-900 dark:text-white lowercase group-hover/avatar:text-blue-500 transition-colors">@{post.user}</h4>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{post.time}</p>
                        </div>
                    </Link>
                    <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">•••</button>
                </div>

                <p className="text-zinc-800 dark:text-zinc-200 text-lg mb-4 leading-relaxed font-medium">
                    {post.content}
                </p>

                {post.image && (
                    <div className="rounded-[32px] overflow-hidden mb-4 border border-black/5 dark:border-white/5">
                        <img
                            src={post.image}
                            className="w-full object-cover max-h-[400px]"
                            alt=""
                            loading="lazy"
                            decoding="async"
                        />
                    </div>
                )}

                <div className="flex gap-8 border-t border-black/5 dark:border-white/5 pt-4">
                    <button
                        onClick={() => toggleLike(post.id)}
                        className={`flex items-center gap-2 transition-all active:scale-125 ${post.isLiked ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-500 hover:text-red-500'}`}
                    >
                        {post.isLiked ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-red-500"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                        )}
                        <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">{post.likes}</span>
                    </button>
                    <button
                        onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                        className="flex items-center gap-2 text-zinc-600 dark:text-zinc-500 hover:text-blue-500 transition-all"
                    >
                        <span className="text-xl">💬</span>
                        <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">{post.comments}</span>
                    </button>
                    <button className="flex items-center gap-2 text-zinc-500 hover:text-green-500 transition-colors ml-auto">
                        <span className="text-xl">🔗</span>
                    </button>
                </div>

                {/* Comments Section - CSS-based animation for performance */}
                <div className={`overflow-hidden transition-all duration-300 ease-out border-t border-black/5 dark:border-white/5 mt-4 ${commentingOn === post.id ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 border-t-0'
                    }`}>
                    <div className="py-4 space-y-4">
                        {loadingComments[post.id] ? (
                            <p className="text-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest animate-pulse">Cargando comentarios...</p>
                        ) : comments[post.id]?.length > 0 ? (
                            comments[post.id].map(comment => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                                        <img
                                            src={comment.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                                            className="w-full h-full object-cover"
                                            alt=""
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                                        <p className="text-[10px] font-black text-zinc-900 dark:text-white capitalize mb-1">{comment.profiles?.name || 'Usuario'}</p>
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-tight">{comment.content}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest py-2">Sé el primero en comentar ✨</p>
                        )}
                    </div>

                    {/* Comment Input */}
                    <div className="pt-2 flex gap-3 pb-4">
                        <input
                            type="text"
                            placeholder="Escribe un comentario..."
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                            className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none ring-1 ring-black/5 dark:ring-white/10 focus:ring-blue-500/50 transition-all font-medium placeholder:text-zinc-500"
                        />
                        <button
                            onClick={() => handleComment(post.id)}
                            disabled={!commentInput.trim()}
                            className="bg-zinc-900 dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest px-6 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            Enviar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});


const MOCK_POSTS = [];

export default function SocialFeed({ profileUserId = null }) {
    const { isLoggedIn, session, userProfile } = useWishlist();
    const [input, setInput] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const fileInputRef = useRef(null);
    const [posts, setPosts] = useState([]);
    const [isPosting, setIsPosting] = useState(false);
    const [commentingOn, setCommentingOn] = useState(null);
    const [commentInput, setCommentInput] = useState('');
    const [comments, setComments] = useState({}); // { postId: [comments] }
    const [loadingComments, setLoadingComments] = useState({});

    useEffect(() => {
        const fetchPosts = async () => {
            console.log('🔄 Fetching posts...');

            // Fetch posts without join first (more reliable)
            let query = supabase
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (profileUserId) {
                query = query.eq('user_id', profileUserId);
            }

            const { data: postsData, error: postsError } = await query;

            if (postsError) {
                console.error('❌ Error fetching posts:', postsError);
                setPosts([]);
                return;
            }

            console.log('✅ Posts fetched:', postsData?.length || 0);

            if (!postsData || postsData.length === 0) {
                console.log('📭 No hay publicaciones en la base de datos.');
                setPosts([]); // Show empty state instead of mocks when database is truly empty
                return;
            }

            // Fetch user likes if logged in
            let userLikedPostIds = new Set();
            if (isLoggedIn && userProfile?.id) {
                const { data: likesData } = await supabase
                    .from('post_likes')
                    .select('post_id')
                    .eq('user_id', userProfile.id);

                if (likesData) {
                    userLikedPostIds = new Set(likesData.map(l => l.post_id));
                }
            }

            // Fetch profiles separately for each post
            const userIds = [...new Set(postsData.map(p => p.user_id).filter(Boolean))];
            let profilesMap = {};

            if (userIds.length > 0) {
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, name, avatar_url')
                    .in('id', userIds);

                if (profilesData) {
                    profilesMap = Object.fromEntries(profilesData.map(p => [p.id, p]));
                }
            }

            // Format posts with profile info
            const formatted = postsData.map(p => {
                const profile = profilesMap[p.user_id];
                return {
                    id: p.id,
                    userId: p.user_id,
                    user: profile?.name || 'Usuario',
                    avatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
                    content: p.content,
                    image: p.media_url,
                    time: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Ahora',
                    likes: p.likes_count || 0,
                    comments: p.comments_count || 0,
                    isLiked: userLikedPostIds.has(p.id)
                };
            });

            setPosts(formatted);
        };

        fetchPosts();

        // Subscribe to real-time changes
        const channel = supabase
            .channel(`public:posts:${profileUserId || 'all'}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
                console.log('Real-time post update!');
                fetchPosts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profileUserId, isLoggedIn]);

    const fetchComments = async (postId) => {
        if (loadingComments[postId]) return;

        setLoadingComments(prev => ({ ...prev, [postId]: true }));

        try {
            // Fetch comments without join first
            const { data: commentsData, error } = await supabase
                .from('post_comments')
                .select('*')
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching comments:', error);
                setComments(prev => ({ ...prev, [postId]: [] }));
                return;
            }

            if (!commentsData || commentsData.length === 0) {
                setComments(prev => ({ ...prev, [postId]: [] }));
                return;
            }

            // Fetch profiles separately
            const userIds = [...new Set(commentsData.map(c => c.user_id).filter(Boolean))];
            let profilesMap = {};

            if (userIds.length > 0) {
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, name, avatar_url')
                    .in('id', userIds);

                if (profilesData) {
                    profilesMap = Object.fromEntries(profilesData.map(p => [p.id, p]));
                }
            }

            // Format comments with profile info
            const formatted = commentsData.map(c => ({
                ...c,
                profiles: profilesMap[c.user_id] || { name: 'Usuario', avatar_url: null }
            }));

            setComments(prev => ({ ...prev, [postId]: formatted }));
        } finally {
            setLoadingComments(prev => ({ ...prev, [postId]: false }));
        }
    };


    useEffect(() => {
        if (commentingOn) {
            fetchComments(commentingOn);
        }
    }, [commentingOn]);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
        }
    };

    const handlePost = async () => {
        if (!input.trim() && !selectedImage || isPosting) return;

        // Validar que el usuario está logueado
        if (!isLoggedIn || !session?.user) {
            alert('Debes iniciar sesión para publicar.');
            return;
        }

        setIsPosting(true);

        try {
            let imageUrl = null;
            if (selectedImage) {
                try {
                    const res = await uploadToCloudinary(selectedImage);
                    imageUrl = res.secure_url;
                } catch (uploadErr) {
                    console.error('Error uploading image:', uploadErr);
                    // Continue without image
                }
            }

            console.log('Posting with user_id:', userProfile.id);

            const { data, error } = await supabase
                .from('posts')
                .insert({
                    user_id: session.user.id,
                    content: input,
                    media_url: imageUrl,
                    created_at: new Date().toISOString()
                })
                .select();

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            console.log('✅ Post creado en DB:', data);

            // Add to local state immediately for instant feedback
            if (data && data[0]) {
                const newPost = {
                    id: data[0].id,
                    userId: userProfile.id,
                    user: userProfile.name || userProfile.email?.split('@')[0] || 'Usuario',
                    avatar: userProfile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
                    content: input,
                    image: imageUrl,
                    time: 'Ahora',
                    likes: 0,
                    comments: 0,
                    isLiked: false
                };
                setPosts(prev => [newPost, ...prev]);
            }

            setInput('');
            setSelectedImage(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('❌ Error posting:', error);
            // Better error reporting
            const msg = error.message || 'Error desconocido';
            alert(`Error al publicar: ${msg}\n\nDetalles en la consola.`);
        } finally {
            setIsPosting(false);
        }
    };

    const toggleLike = async (postId) => {
        if (!isLoggedIn) {
            alert('¡Oye! Inicia sesión para dar like.');
            return;
        }

        const post = posts.find(p => p.id === postId);
        const isLiked = post.isLiked;

        // Optimistic UI
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, likes: isLiked ? p.likes - 1 : p.likes + 1, isLiked: !isLiked } : p
        ));

        try {
            console.log(`👍 Toggling like for post ${postId}...`);
            if (isLiked) {
                const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', session.user.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: session.user.id });
                if (error) throw error;
            }
            console.log('✅ Like toggled successfully');
        } catch (error) {
            console.error('❌ Error toggling like:', error);
            // Revert optimistic UI on error
            setPosts(prev => prev.map(p =>
                p.id === postId ? { ...p, likes: isLiked ? p.likes + 1 : p.likes - 1, isLiked: isLiked } : p
            ));
        }
    };

    const handleComment = async (postId) => {
        if (!commentInput.trim() || !isLoggedIn) return;

        const content = commentInput;
        setCommentInput('');
        setCommentingOn(null);

        // Optimistic UI
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p
        ));

        try {
            const { error } = await supabase
                .from('post_comments')
                .insert({
                    post_id: postId,
                    user_id: session.user.id,
                    content: content
                });
            if (error) throw error;

            // Refrescar comentarios inmediatamente
            fetchComments(postId);
        } catch (error) {
            console.error('Error commenting:', error);
            alert('No pudimos enviar tu comentario.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 pb-32">
            {/* Create Post Header - Solo si es el feed general o mi propio perfil */}
            {(!profileUserId || (profileUserId === session?.user?.id)) && (
                !isLoggedIn ? (
                    <div className="bg-blue-600 rounded-[32px] p-8 mb-8 text-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter mb-4 italic">Únete a la Comunidad</h3>
                        <p className="text-blue-100 mb-6 font-medium text-sm md:text-base">Inicia sesión para compartir tus fotos, reseñas y vibras con la comunidad.</p>
                        <Link to="/profile" className="inline-block bg-white text-blue-600 px-10 py-4 rounded-full font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl">Iniciar Sesión</Link>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 mb-8 border border-black/10 dark:border-white/10 shadow-xl">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl shadow-inner border border-black/5 dark:border-white/5 shrink-0 overflow-hidden">
                                {userProfile?.avatar_url ? (
                                    <img src={userProfile.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    '👤'
                                )}
                            </div>
                            <div className="flex-1">
                                <textarea
                                    placeholder="¿Qué quieres compartir con la comunidad?"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    className="w-full bg-transparent border-none outline-none text-zinc-900 dark:text-white resize-none text-lg placeholder:text-zinc-500 dark:placeholder:text-zinc-700"
                                    rows="2"
                                />

                                {selectedImage && (
                                    <div className="mt-4 relative group">
                                        <img src={URL.createObjectURL(selectedImage)} className="w-24 h-24 object-cover rounded-2xl border-2 border-blue-500 shadow-lg" alt="" />
                                        <button
                                            onClick={() => setSelectedImage(null)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-lg hover:scale-110 transition-transform"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}

                                <div className="flex justify-between items-center mt-4 border-t border-black/5 dark:border-white/5 pt-4">
                                    <div className="flex gap-3 md:gap-5">
                                        <input
                                            type="file"
                                            className="hidden"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-colors text-xl"
                                            title="Subir Imagen"
                                        >
                                            🖼️
                                        </button>
                                        <button className="text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-colors text-xl">📹</button>
                                        <button className="text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-colors text-xl">🛒</button>
                                    </div>
                                    <button
                                        onClick={handlePost}
                                        disabled={(!input.trim() && !selectedImage) || isPosting}
                                        className="bg-blue-600 disabled:opacity-50 text-white px-8 py-2.5 rounded-full font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/30"
                                    >
                                        {isPosting ? 'Publicando...' : 'Publicar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* Posts Grid - Optimized with memoized components */}
            <div className="space-y-6">
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            toggleLike={toggleLike}
                            commentingOn={commentingOn}
                            setCommentingOn={setCommentingOn}
                            commentInput={commentInput}
                            setCommentInput={setCommentInput}
                            handleComment={handleComment}
                            comments={comments}
                            loadingComments={loadingComments}
                        />
                    ))
                ) : (
                    <div className="py-20 text-center space-y-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-[40px] border border-dashed border-black/5 dark:border-white/10">
                        <span className="text-5xl block mb-2 opacity-20">✨</span>
                        <h3 className="text-xl font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-tighter italic">La comunidad espera...</h3>
                        <p className="text-zinc-500 dark:text-zinc-500 font-bold uppercase text-[10px] tracking-[0.3em]">Sé el primero en compartir algo</p>
                    </div>
                )}
            </div>
        </div>
    );
}
