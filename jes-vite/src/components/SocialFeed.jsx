'use client';
import { useRef, useEffect, memo, useCallback, useState } from 'react';
import { supabase } from '../services/supabase';
import { uploadToCloudinary } from '../services/cloudinary';
import { motion, AnimatePresence } from 'framer-motion';
import { useWishlist } from '../context/WishlistContext';
import Link from 'next/link';
import Image from 'next/image';

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
                    <Link href={post.userId ? `/wishlist?user=${post.userId}` : '#'} className="flex gap-4 group/avatar">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-transparent group-hover/avatar:border-blue-500 transition-all relative bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl">
                            {post.avatar ? (
                                <Image
                                    src={post.avatar}
                                    fill
                                    sizes="48px"
                                    className="object-cover"
                                    alt=""
                                />
                            ) : (
                                '👤'
                            )}
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
                    <div className="rounded-[32px] overflow-hidden mb-4 border border-black/5 dark:border-white/5 relative aspect-video">
                        <Image
                            src={post.image}
                            fill
                            sizes="(max-width: 768px) 100vw, 640px"
                            className="object-cover"
                            alt=""
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
                                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 relative">
                                        <Image
                                            src={comment.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                                            fill
                                            sizes="32px"
                                            className="object-cover"
                                            alt=""
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
    const { isLoggedIn, session, userProfile, loading: authLoading } = useWishlist();
    const [input, setInput] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const fileInputRef = useRef(null);
    const [posts, setPosts] = useState([]);
    const [isPosting, setIsPosting] = useState(false);
    const [commentingOn, setCommentingOn] = useState(null);
    const [commentInput, setCommentInput] = useState('');
    const [comments, setComments] = useState({}); // { postId: [comments] }
    const [loadingComments, setLoadingComments] = useState({});

    // Pagination states
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const pageSize = 10;
    const loaderRef = useRef(null);

    const fetchPosts = async (isInitial = true) => {
        if (isInitial) {
            setPage(0);
            setHasMore(true);
        } else {
            if (!hasMore || isFetchingMore) return;
            setIsFetchingMore(true);
        }

        const currentPage = isInitial ? 0 : page;
        const start = currentPage * pageSize;
        const end = start + pageSize - 1;

        console.log(`🔄 Fetching posts (page ${currentPage}, range ${start}-${end})...`);

        try {
            let query = supabase
                .from('posts')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(start, end);

            if (profileUserId) {
                query = query.eq('user_id', profileUserId);
            }

            const { data: postsData, error: postsError, count } = await query;

            if (postsError) throw postsError;

            if (!postsData || postsData.length === 0) {
                setHasMore(false);
                if (isInitial) setPosts([]);
                return;
            }

            // Fetch profiles for these posts
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

            // Fetch likes for these posts if logged in
            let userLikedPostIds = new Set();
            if (isLoggedIn && (userProfile?.id || session?.user?.id)) {
                const currentId = userProfile?.id || session?.user?.id;
                const { data: likesData } = await supabase
                    .from('post_likes')
                    .select('post_id')
                    .eq('user_id', currentId)
                    .in('post_id', postsData.map(p => p.id));
                if (likesData) {
                    userLikedPostIds = new Set(likesData.map(l => l.post_id));
                }
            }

            const formatted = postsData.map(p => ({
                id: p.id,
                userId: p.user_id,
                user: profilesMap[p.user_id]?.name || 'Comunidad JES',
                avatar: profilesMap[p.user_id]?.avatar_url || null,
                content: p.content,
                image: p.media_url,
                time: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Reciente',
                likes: p.likes_count || 0,
                comments: p.comments_count || 0,
                isLiked: userLikedPostIds.has(p.id)
            }));

            if (isInitial) {
                setPosts(formatted);
            } else {
                setPosts(prev => [...prev, ...formatted]);
            }

            setHasMore(postsData.length === pageSize);
            if (!isInitial) setPage(prev => prev + 1);

        } catch (err) {
            console.error('❌ Error fetching posts:', err);
        } finally {
            setIsFetchingMore(false);
        }
    };

    // Initial load and scroll observer
    useEffect(() => {
        fetchPosts(true);

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
                fetchPosts(false);
            }
        }, { threshold: 1.0 });

        if (loaderRef.current) observer.observe(loaderRef.current);

        // Smarter Real-time: Just fetch the single newest post when inserted
        const channel = supabase
            .channel(`public:posts:${profileUserId || 'all'}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
                console.log('✨ New post received!');
                const newPost = payload.new;

                // Fetch profile for the new post
                const { data: pData } = await supabase
                    .from('profiles')
                    .select('name, avatar_url')
                    .eq('id', newPost.user_id)
                    .single();

                setPosts(prev => {
                    // Evitar duplicados si el usuario es el autor y ya se agregó de forma optimista
                    if (prev.some(p => p.id === newPost.id)) return prev;

                    return [{
                        id: newPost.id,
                        userId: newPost.user_id,
                        user: pData?.name || 'Comunidad JES',
                        avatar: pData?.avatar_url || null,
                        content: newPost.content,
                        image: newPost.media_url,
                        time: 'Ahora',
                        likes: 0,
                        comments: 0,
                        isLiked: false
                    }, ...prev];
                });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
                setPosts(prev => prev.filter(p => p.id !== payload.old.id));
            })
            .subscribe();

        return () => {
            observer.disconnect();
            supabase.removeChannel(channel);
        };
    }, [isLoggedIn, profileUserId]);

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
        if ((!input.trim() && !selectedImage) || isPosting) return;

        // Get user ID - try multiple sources
        const userId = userProfile?.id || session?.user?.id;

        console.log('🔍 Auth debug:', {
            isLoggedIn,
            userProfileId: userProfile?.id,
            sessionUserId: session?.user?.id,
            resolvedUserId: userId
        });

        // Validar que el usuario está logueado
        if (!userId) {
            alert('Debes iniciar sesión para publicar. Por favor recarga la página.');
            return;
        }

        setIsPosting(true);

        try {
            let imageUrl = null;
            if (selectedImage) {
                try {
                    console.log('📷 Uploading image...');
                    const res = await uploadToCloudinary(selectedImage);
                    imageUrl = res.secure_url;
                    console.log('✅ Image uploaded:', imageUrl);
                } catch (uploadErr) {
                    console.error('Error uploading image:', uploadErr);
                    // Continue without image
                }
            }

            const postData = {
                user_id: userId,
                content: input.trim(),
                media_url: imageUrl,
                created_at: new Date().toISOString()
            };

            console.log('📤 Inserting post:', postData);

            const { data, error } = await supabase
                .from('posts')
                .insert(postData)
                .select()
                .single();

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            console.log('✅ Post creado:', data);

            // Add to local state immediately
            if (data) {
                const newPost = {
                    id: data.id,
                    userId: userId,
                    user: userProfile?.name || session?.user?.email?.split('@')[0] || 'Usuario',
                    avatar: userProfile?.avatar_url || null,
                    content: input.trim(),
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
            const msg = error.message || 'Error desconocido';
            alert(`Error al publicar: ${msg}`);
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
            {/* Header Social Visual Verification */}
            <div className="flex flex-col gap-2 mb-10">
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">
                    Para <span className="text-blue-600">Ti</span>
                    <span className="ml-4 text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-full not-italic tracking-[0.2em] align-middle font-black shadow-lg shadow-blue-500/20">LIVE</span>
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-[0.4em]">COMUNIDAD OFICIAL JES STORE</p>
            </div>

            {/* Create Post Header - Solo si es el feed general o mi propio perfil */}
            {(!profileUserId || (profileUserId === session?.user?.id)) && (
                authLoading ? (
                    <div className="bg-zinc-100 dark:bg-zinc-900 rounded-[32px] p-8 mb-8 text-center animate-pulse">
                        <div className="h-6 w-48 mx-auto bg-zinc-300 dark:bg-zinc-700 rounded-lg mb-4" />
                        <div className="h-4 w-64 mx-auto bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                ) : !isLoggedIn ? (
                    <div className="bg-blue-600 rounded-[32px] p-8 mb-8 text-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter mb-4 italic">Únete a la Comunidad</h3>
                        <p className="text-blue-100 mb-6 font-medium text-sm md:text-base">Inicia sesión para compartir tus fotos, reseñas y vibras con la comunidad.</p>
                        <Link href="/profile" className="inline-block bg-white text-blue-600 px-10 py-4 rounded-full font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl">Iniciar Sesión</Link>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 mb-8 border border-black/10 dark:border-white/10 shadow-xl">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl shadow-inner border border-black/5 dark:border-white/5 shrink-0 overflow-hidden relative">
                                {userProfile?.avatar_url ? (
                                    <Image
                                        src={userProfile.avatar_url}
                                        fill
                                        sizes="48px"
                                        className="object-cover"
                                        alt=""
                                    />
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
                    <>
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                toggleLike={toggleLike}
                                commentingOn={commentingOn}
                                setCommentingOn={setCommentingOn}
                                commentInput={commentInput}
                                setCommentInput={setCommentInput}
                                handleComment={handleComment}
                                comments={comments[post.id] || []}
                                isLoadingComments={loadingComments[post.id]}
                                fetchComments={fetchComments}
                            />
                        ))}

                        {/* Elemento para detectar scroll infinito */}
                        <div ref={loaderRef} className="py-12 flex flex-col items-center gap-4">
                            {hasMore ? (
                                <>
                                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 animate-pulse">Cargando más vibras...</p>
                                </>
                            ) : (
                                <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent my-8 relative">
                                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-black px-4 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Fin de la comunidad</span>
                                </div>
                            )}
                        </div>
                    </>
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
