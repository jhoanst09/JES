import { useRef, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { uploadToCloudinary } from '../services/cloudinary';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useWishlist } from '../context/WishlistContext';
import { Link } from 'react-router-dom';

const MOCK_POSTS = [
    {
        id: 'p1',
        userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        user: 'jhoanstmer09',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150',
        content: '¡Increíble! Este Funko de Gojo se ve genial 🔥. Ya lo tengo en mi colección, ¡qué elegancia!',
        time: 'Hace 2h',
        likes: 24,
        comments: 5,
        isLiked: false
    },
    {
        id: 'p2',
        userId: 'e1234567-e89b-12d3-a456-426614174000',
        user: 'laura_vibe',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
        content: 'Buscando un regalo para mi novio... ¿El iPhone 17 Pro o el espejo Blonde? 🤔',
        time: 'Hace 5h',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=800',
        likes: 12,
        comments: 8,
        isLiked: false
    }
];

export default function SocialFeed() {
    const { isLoggedIn, userProfile } = useWishlist();
    const [input, setInput] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const fileInputRef = useRef(null);
    const [posts, setPosts] = useState([]);
    const [isPosting, setIsPosting] = useState(false);
    const [commentingOn, setCommentingOn] = useState(null);
    const [commentInput, setCommentInput] = useState('');

    useEffect(() => {
        const fetchPosts = async () => {
            // 1. Fetch Posts
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('*, profiles(name, avatar_url)')
                .order('created_at', { ascending: false });

            if (postsError) {
                console.error('Error fetching posts:', postsError);
                setPosts(MOCK_POSTS);
                return;
            }

            // 2. Fetch User Likes if logged in
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

            // 3. Format with isLiked status
            const formatted = postsData.map(p => ({
                id: p.id,
                userId: p.user_id,
                user: p.profiles?.name || 'anon',
                avatar: p.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
                content: p.content,
                image: p.media_url,
                time: new Date(p.created_at).toLocaleDateString(),
                likes: p.likes_count || 0,
                comments: p.comments_count || 0,
                isLiked: userLikedPostIds.has(p.id)
            }));

            setPosts(formatted);
        };

        fetchPosts();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('public:posts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
                fetchPosts();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
        }
    };

    const handlePost = async () => {
        if (!input.trim() && !selectedImage || isPosting) return;
        setIsPosting(true);

        try {
            let imageUrl = null;
            if (selectedImage) {
                const res = await uploadToCloudinary(selectedImage);
                imageUrl = res.secure_url;
            }

            const { error } = await supabase
                .from('posts')
                .insert({
                    user_id: userProfile?.id,
                    content: input,
                    media_url: imageUrl,
                    created_at: new Date().toISOString()
                });

            if (error) throw error;

            setInput('');
            setSelectedImage(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error posting:', error);
            alert('¡Vaya! No pudimos realizar la publicación. Intenta de nuevo en un momento.');
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
            if (isLiked) {
                await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userProfile?.id);
            } else {
                await supabase.from('post_likes').insert({ post_id: postId, user_id: userProfile?.id });
            }
        } catch (error) {
            console.error('Error toggling like:', error);
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
                    user_id: userProfile?.id,
                    content: content
                });
            if (error) throw error;
        } catch (error) {
            console.error('Error commenting:', error);
            alert('No pudimos enviar tu comentario.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 pb-32">
            {/* Create Post Header */}
            {!isLoggedIn ? (
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
            )}

            {/* Posts Grid */}
            <div className="space-y-6">
                {posts.map((post) => (
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-zinc-50 dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-[40px] overflow-hidden shadow-sm"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <Link to={`/wishlist?user=${post.userId || ''}`} className="flex gap-4 group/avatar">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-transparent group-hover/avatar:border-blue-500 transition-all">
                                        <img src={post.avatar} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-zinc-900 dark:text-white lowercase group-hover/avatar:text-blue-500 transition-colors">@{post.user?.name || post.user}</h4>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{post.time}</p>
                                    </div>
                                </Link>
                                <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">•••</button>
                            </div>

                            <p className="text-zinc-800 dark:text-zinc-200 text-lg mb-4 leading-relaxed font-medium">
                                {post.content}
                            </p>

                            {post.image && (
                                <div className="rounded-[32px] overflow-hidden mb-4 border border-black/5 dark:border-white/5 shadow-inner">
                                    <img src={post.image} className="w-full object-cover max-h-[400px]" alt="" />
                                </div>
                            )}

                            <div className="flex gap-8 border-t border-black/5 dark:border-white/5 pt-4">
                                <button
                                    onClick={() => toggleLike(post.id)}
                                    className={`flex items-center gap-2 transition-all active:scale-125 ${post.isLiked ? 'text-red-500' : 'text-zinc-500 hover:text-red-500'}`}
                                >
                                    {post.isLiked ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-red-500"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 group-hover:text-red-500 transition-colors"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                                    )}
                                    <span className="text-xs font-black">{post.likes}</span>
                                </button>
                                <button
                                    onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                                    className="flex items-center gap-2 text-zinc-500 hover:text-blue-500 transition-all"
                                >
                                    <span className="text-xl">💬</span>
                                    <span className="text-xs font-black">{post.comments}</span>
                                </button>
                                <button className="flex items-center gap-2 text-zinc-500 hover:text-green-500 transition-colors ml-auto">
                                    <span className="text-xl">🔗</span>
                                </button>
                            </div>

                            {/* Comment Input */}
                            <AnimatePresence>
                                {commentingOn === post.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-4 flex gap-3">
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Escribe un comentario..."
                                                value={commentInput}
                                                onChange={(e) => setCommentInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                                                className="flex-1 bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500 transition-all font-medium"
                                            />
                                            <button
                                                onClick={() => handleComment(post.id)}
                                                className="text-blue-500 font-black text-[10px] uppercase tracking-widest px-4"
                                            >
                                                Enviar
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
