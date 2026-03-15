'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SteamReviews
 * 
 * Steam-style review component with thumbs up/down and
 * recommendation percentage bar.
 */
export default function SteamReviews({ productId, serviceId, userId }) {
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState({ total: 0, positive: 0, negative: 0, percentage: 0 });
    const [myReview, setMyReview] = useState(null);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const fetchReviews = useCallback(async () => {
        try {
            const param = productId ? `product_id=${productId}` : `service_id=${serviceId}`;
            const res = await fetch(`/api/marketplace/reviews?${param}`);
            if (res.ok) {
                const data = await res.json();
                setReviews(data.reviews || []);
                setStats(data.stats || { total: 0, positive: 0, negative: 0, percentage: 0 });
                // Find user's own review
                if (userId) {
                    const mine = data.reviews.find(r => r.user_id === userId);
                    setMyReview(mine || null);
                }
            }
        } catch (err) {
            console.error('Reviews fetch error:', err);
        }
    }, [productId, serviceId, userId]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const handleSubmit = async (recommended) => {
        if (!userId) return;
        setSubmitting(true);

        try {
            const res = await fetch('/api/marketplace/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    product_id: productId || null,
                    service_id: serviceId || null,
                    recommended,
                    comment: comment.trim() || null,
                }),
            });

            if (res.ok) {
                setComment('');
                setShowForm(false);
                fetchReviews();
            }
        } catch (err) {
            console.error('Review submit error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const getLabel = (pct) => {
        if (pct >= 95) return { text: 'Abrumadoramente positivas', color: 'text-blue-400' };
        if (pct >= 80) return { text: 'Muy positivas', color: 'text-blue-400' };
        if (pct >= 70) return { text: 'Mayormente positivas', color: 'text-blue-500' };
        if (pct >= 40) return { text: 'Mixtas', color: 'text-amber-500' };
        if (pct >= 20) return { text: 'Mayormente negativas', color: 'text-orange-500' };
        return { text: 'Negativas', color: 'text-red-500' };
    };

    const label = getLabel(stats.percentage);

    return (
        <div className="space-y-4">
            {/* Stats Bar */}
            {stats.total > 0 && (
                <div className="rounded-2xl p-5 bg-zinc-900/80 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                            Reseñas de usuarios
                        </p>
                        <span className="text-xs text-zinc-500">
                            {stats.total} reseña{stats.total !== 1 && 's'}
                        </span>
                    </div>

                    {/* Percentage bar */}
                    <div className="relative h-3 rounded-full overflow-hidden bg-red-500/30 mb-3">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.percentage}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">👍</span>
                            <span className={`text-sm font-black ${label.color}`}>
                                {stats.percentage}% — {label.text}
                            </span>
                        </div>
                        <div className="flex gap-3 text-xs text-zinc-500">
                            <span className="text-blue-400">👍 {stats.positive}</span>
                            <span className="text-red-400">👎 {stats.negative}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Write Review Button (or show existing) */}
            {userId && (
                <div>
                    {myReview ? (
                        <div className="p-4 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                            <div className="flex items-center gap-2 mb-1">
                                <span>{myReview.recommended ? '👍' : '👎'}</span>
                                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Tu reseña</span>
                            </div>
                            {myReview.comment && (
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">{myReview.comment}</p>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowForm(prev => !prev)}
                            className="w-full py-3 rounded-xl border border-dashed border-zinc-300 dark:border-white/20 text-zinc-500 hover:border-blue-500 hover:text-blue-500 transition-all text-sm font-bold"
                        >
                            ✍️ Escribir una reseña
                        </button>
                    )}
                </div>
            )}

            {/* Review Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 space-y-4">
                            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                ¿Recomiendas este producto?
                            </p>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Cuéntanos tu experiencia (opcional)"
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none resize-none focus:border-blue-500"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleSubmit(true)}
                                    disabled={submitting}
                                    className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50"
                                >
                                    👍 Sí
                                </button>
                                <button
                                    onClick={() => handleSubmit(false)}
                                    disabled={submitting}
                                    className="flex-1 py-3 rounded-xl bg-red-500/80 text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    👎 No
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Recent Reviews */}
            {reviews.length > 0 && (
                <div className="space-y-2">
                    {reviews.slice(0, 5).map(review => (
                        <div key={review.id} className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm">{review.recommended ? '👍' : '👎'}</span>
                                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                    {review.reviewer_name || 'Anónimo'}
                                </span>
                                <span className="text-[10px] text-zinc-400 ml-auto">
                                    {new Date(review.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                            {review.comment && (
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{review.comment}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
