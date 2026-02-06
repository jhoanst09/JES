'use client';
import { useRef, useEffect, memo, useCallback, useState } from 'react';
import { uploadToS3 } from '../utils/s3';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

/**
 * SocialFeed - Clean AWS Architecture
 * 
 * Posts stored in RDS, media in S3.
 */

// ==========================================
// REPORTING MODAL
// ==========================================
const ReportingModal = ({ isOpen, onClose, onReport, postId }) => {
    const options = ['Spam', 'Acoso', 'Inapropiado', 'Desinformación'];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-[40px] p-10 shadow-2xl border border-white/10"
            >
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 italic">Reportar <span className="text-red-500">Contenido</span></h3>
                <p className="text-sm text-zinc-500 mb-8 font-medium">Ayúdanos a mantener la comunidad segura. ¿Cuál es el problema?</p>

                <div className="space-y-3">
                    {options.map(opt => (
                        <button
                            key={opt}
                            onClick={() => onReport(opt)}
                            className="w-full text-left p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all font-bold text-sm uppercase tracking-widest border border-black/5 dark:border-white/5"
                        >
                            {opt}
                        </button>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="mt-8 w-full py-4 text-zinc-400 font-black uppercase tracking-widest text-[10px] hover:text-zinc-600 dark:hover:text-white transition-colors"
                >
                    Cancelar
                </button>
            </motion.div>
        </div>
    );
};

// ==========================================
// COMMENT SECTION COMPONENT
// ==========================================
const CommentSection = ({ postId, currentUserId, authorName }) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState(null);

    const fetchComments = useCallback(async () => {
        try {
            const res = await fetch(`/api/posts/${postId}/comments`);
            const data = await res.json();
            setComments(Array.isArray(data.comments) ? data.comments : []);
        } catch (error) {
            console.error('Error fetching comments:', error);
            setComments([]);
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleSendComment = async () => {
        if (!newComment.trim()) return;

        try {
            const res = await fetch('/api/posts/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId,
                    userId: currentUserId,
                    content: newComment,
                    parentId: replyTo?.id || null
                })
            });
            const { comment } = await res.json();
            if (comment) {
                setComments(prev => [...prev, comment]);
                setNewComment('');
                setReplyTo(null);
            }
        } catch (error) {
            console.error('Error sending comment:', error);
        }
    };

    // Tree structure for comments with safety
    const commentTree = (comments || []).filter(c => !c?.parent_id).map(parent => ({
        ...parent,
        replies: (comments || []).filter(c => c?.parent_id === parent?.id)
    }));

    return (
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            {loading ? (
                <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="max-h-96 overflow-y-auto no-scrollbar space-y-4">
                    {(commentTree || []).length === 0 ? (
                        <p className="text-center text-zinc-500 text-[10px] uppercase font-bold tracking-widest py-4">Sin comentarios aún</p>
                    ) : (
                        commentTree.map(comment => (
                            <div key={comment.id} className="space-y-3">
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center text-[10px] font-bold overflow-hidden border border-black/5">
                                        {comment.author_avatar ? (
                                            <img
                                                src={comment.author_avatar}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.innerHTML = comment.author_name?.[0]?.toUpperCase() || 'U';
                                                }}
                                            />
                                        ) : (
                                            <span className="text-zinc-500">{comment.author_name?.[0] || 'U'}</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl rounded-tl-none border border-black/5 dark:border-white/5">
                                            <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{comment.author_name}</p>
                                            <p className="text-sm text-zinc-800 dark:text-zinc-200">{comment.content}</p>
                                        </div>
                                        <button
                                            onClick={() => setReplyTo({ id: comment.id, name: comment.author_name })}
                                            className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1 ml-1 hover:underline"
                                        >
                                            Responder
                                        </button>
                                    </div>
                                </div>
                                {/* Replies */}
                                {(comment.replies || []).map(reply => (
                                    <div key={reply.id} className="flex gap-3 ml-10">
                                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center text-[8px] font-bold overflow-hidden border border-black/5">
                                            {reply.author_avatar ? (
                                                <img
                                                    src={reply.author_avatar}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.innerHTML = reply.author_name?.[0]?.toUpperCase() || 'U';
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-zinc-500">{reply.author_name?.[0] || 'U'}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/30 p-2 rounded-xl rounded-tl-none border border-black/5 dark:border-white/5">
                                            <p className="text-[8px] font-black uppercase text-zinc-500 mb-0.5">{reply.author_name}</p>
                                            <p className="text-xs text-zinc-800 dark:text-zinc-300">{reply.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Input Overlay for Reply */}
            <AnimatePresence>
                {replyTo && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl flex items-center justify-between"
                    >
                        <p className="text-[10px] font-black uppercase text-amber-600 pl-2">Respondiendo a @{replyTo.name}</p>
                        <button onClick={() => setReplyTo(null)} className="text-amber-600 font-bold px-2">×</button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    placeholder="Escribe un comentario..."
                    className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 text-zinc-800 dark:text-white"
                />
                <button
                    onClick={handleSendComment}
                    disabled={!newComment.trim()}
                    className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                >
                    ➔
                </button>
            </div>
        </div>
    );
};

// ==========================================
// POST CARD COMPONENT
// ==========================================
const PostCard = memo(({ post, currentUserId, onLike, onDelete }) => {
    const [likes, setLikes] = useState(post.likes_count || 0);
    const [liked, setLiked] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    const isAuthor = post.user_id === currentUserId;

    const handleLike = async () => {
        setLiked(!liked);
        setLikes(prev => liked ? prev - 1 : prev + 1);
        try {
            await onLike(post.id);
        } catch (error) {
            setLiked(liked);
            setLikes(likes);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-[32px] p-5 mb-6 shadow-xl border border-black/5 dark:border-white/5 relative"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-white font-bold overflow-hidden border border-black/5 dark:border-white/10 shrink-0 shadow-inner">
                        {post.author_avatar ? (
                            <img
                                src={post.author_avatar}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = post.author_name?.[0]?.toUpperCase() || 'U';
                                }}
                            />
                        ) : (
                            <span className="text-zinc-400 select-none text-xl">
                                {post.author_name?.[0]?.toUpperCase() || 'U'}
                            </span>
                        )}
                    </div>
                    <div>
                        <p className="font-black text-zinc-900 dark:text-white leading-tight tracking-tight">
                            {post.author_name || 'Usuario'}
                        </p>
                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-0.5">
                            {new Date(post.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                        </p>
                    </div>
                </div>

                {/* Actions Menu (Three Dots) */}
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="w-10 h-10 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
                    >
                        <span className="text-zinc-500 font-bold text-xl leading-none -mt-2">...</span>
                    </button>

                    <AnimatePresence>
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                    className="absolute right-0 top-12 w-48 bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 z-50 overflow-hidden"
                                >
                                    {isAuthor ? (
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                if (confirm('¿Seguro que quieres borrar esta publicación?')) {
                                                    onDelete(post.id);
                                                }
                                            }}
                                            className="w-full text-left px-4 py-3 text-xs font-black uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                        >
                                            🗑️ Borrar Publicación
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                                            className="w-full text-left px-4 py-3 text-xs font-black uppercase text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                                        >
                                            🚩 Reportar contenido
                                        </button>
                                    )}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                <ReportingModal
                    isOpen={showReportModal}
                    onClose={() => setShowReportModal(false)}
                    onReport={(reason) => {
                        console.log(`Post ${post.id} reported for ${reason}`);
                        alert('Gracias por tu reporte. Lo revisaremos pronto.');
                        setShowReportModal(false);
                    }}
                />
            </div>

            {/* Content */}
            {post.content && (
                <p className="text-zinc-800 dark:text-zinc-200 text-base mb-4 leading-relaxed font-medium">
                    {post.content}
                </p>
            )}

            {/* Media */}
            {post.media_url && (
                <div className="mb-4 rounded-3xl overflow-hidden shadow-sm border border-black/5 dark:border-white/5">
                    {post.media_type?.startsWith('video') ? (
                        <video
                            src={post.media_url}
                            controls
                            className="w-full max-h-[500px] object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <img
                            src={post.media_url}
                            alt=""
                            className="w-full max-h-[500px] object-cover"
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=800&q=80'; }}
                        />
                    )}
                </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center gap-6 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all hover:scale-105 ${liked ? 'text-red-500' : 'text-zinc-500 hover:text-red-500'}`}
                >
                    <span className="text-xl">{liked ? '❤️' : '🤍'}</span>
                    <span>{likes}</span>
                </button>
                <button
                    onClick={() => setShowComments(!showComments)}
                    className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all hover:scale-105 ${showComments ? 'text-amber-500' : 'text-zinc-500 hover:text-amber-500'}`}
                >
                    <span className="text-xl">💬</span>
                    <span>{post.comments_count || 0}</span>
                </button>
            </div>

            {/* Comment Section (Expanded) */}
            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <CommentSection
                            postId={post.id}
                            currentUserId={currentUserId}
                            authorName={post.author_name}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

PostCard.displayName = 'PostCard';

// ==========================================
// MAIN SOCIAL FEED COMPONENT
// ==========================================
export default function SocialFeed() {
    const { user, isLoggedIn } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [newPostText, setNewPostText] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    // ==========================================
    // FETCH POSTS
    // ==========================================
    const fetchPosts = useCallback(async () => {
        try {
            const res = await fetch('/api/posts');
            const { posts } = await res.json();
            setPosts(Array.isArray(posts) ? posts : []);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // ==========================================
    // CREATE POST
    // ==========================================
    const handlePost = async () => {
        if (!user?.id || (!newPostText.trim() && !selectedFile)) return;

        setPosting(true);
        try {
            let mediaUrl = null;
            let mediaType = null;

            // Upload media to S3
            if (selectedFile) {
                mediaUrl = await uploadToS3(selectedFile, 'social');
                mediaType = selectedFile.type;
            }

            const res = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    content: newPostText.trim(),
                    mediaUrl,
                    mediaType,
                }),
            });

            const { post } = await res.json();

            // Optimistic add to feed
            setPosts(prev => [post, ...prev]);
            setNewPostText('');
            setSelectedFile(null);

        } catch (error) {
            console.error('Error creating post:', error);
        } finally {
            setPosting(false);
        }
    };

    // ==========================================
    // DELETE POST
    // ==========================================
    const handleDelete = async (postId) => {
        if (!window.confirm('¿Estás seguro de que quieres borrar este post?')) return;

        try {
            const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
            if (res.ok) {
                setPosts(prev => prev.filter(p => p.id !== postId));
            }
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    };

    // ==========================================
    // TOGGLE LIKE
    // ==========================================
    const handleLike = async (postId) => {
        if (!isLoggedIn) {
            window.location.href = '/api/auth/google';
            return;
        }

        await fetch('/api/posts/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, userId: user.id }),
        });
    };

    // ==========================================
    // FILE SELECTION
    // ==========================================
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    // ==========================================
    // RENDER
    // ==========================================
    if (loading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-zinc-100 dark:bg-zinc-800 rounded-[32px] h-64 animate-pulse border border-black/5 dark:border-white/5" />
                ))}
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto px-4 pb-20">
            {/* Create Post */}
            {isLoggedIn && (
                <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 mb-8 shadow-xl border border-black/5 dark:border-white/10">
                    <textarea
                        value={newPostText}
                        onChange={(e) => setNewPostText(e.target.value)}
                        placeholder="¿Qué estás pensando?"
                        className="w-full bg-transparent border-none resize-none focus:outline-none text-zinc-800 dark:text-white placeholder:text-zinc-400 font-medium text-lg"
                        rows={3}
                    />

                    {selectedFile && (
                        <div className="mt-4 relative rounded-2xl overflow-hidden group">
                            {selectedFile.type.startsWith('video') ? (
                                <video src={URL.createObjectURL(selectedFile)} className="w-full h-48 object-cover" />
                            ) : (
                                <img src={URL.createObjectURL(selectedFile)} className="w-full h-48 object-cover" alt="" />
                            )}
                            <button
                                onClick={() => setSelectedFile(null)}
                                className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black transition-all"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                        <div className="flex gap-4">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-sm"
                            >
                                🖼️
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                        <button
                            onClick={handlePost}
                            disabled={posting || (!newPostText.trim() && !selectedFile)}
                            className="px-8 py-3 bg-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {posting ? 'Publicando...' : 'Publicar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Posts Feed */}
            {(!posts || posts?.length === 0) ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-[48px] border border-dashed border-zinc-200 dark:border-zinc-800"
                >
                    <p className="text-6xl mb-6">🥥</p>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-tighter italic">Tu Feed está vacío</h3>
                    <p className="text-zinc-500 text-sm italic max-w-xs mx-auto">Comparte tus mejores momentos y conecta con la comunidad Jes Store.</p>
                </motion.div>
            ) : (
                <div className="space-y-2">
                    {posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUserId={user?.id}
                            onLike={handleLike}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
