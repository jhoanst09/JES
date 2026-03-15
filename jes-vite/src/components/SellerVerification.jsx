'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SellerVerification
 * 
 * Allows users to submit documents for seller verification.
 * Shows current verification status and "Escrow mode" notice
 * for unverified sellers.
 */
export default function SellerVerification({ userId }) {
    const [verification, setVerification] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const fetchStatus = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/marketplace/sellers?user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setVerification(data.verification);
            }
        } catch (err) {
            console.error('Verification status error:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            setError('Archivo muy grande. Máximo 10MB');
            return;
        }

        setUploading(true);
        setError('');

        try {
            // Get presigned URL
            const presignRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type,
                    folder: 'verification',
                }),
            });
            const { uploadUrl, publicUrl } = await presignRes.json();

            // Upload to S3
            await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });

            // Submit verification request
            setSubmitting(true);
            const res = await fetch('/api/marketplace/sellers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    document_url: publicUrl,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setVerification(data.verification);
                setSuccess(true);
            } else {
                setError(data.error || 'Error al enviar');
            }
        } catch (err) {
            setError('Error subiendo documento');
        } finally {
            setUploading(false);
            setSubmitting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (loading) {
        return (
            <div className="p-6 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 animate-pulse">
                <div className="h-5 bg-zinc-200 dark:bg-white/10 rounded w-1/3 mb-3" />
                <div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-2/3" />
            </div>
        );
    }

    const status = verification?.status || 'unverified';

    const statusConfig = {
        unverified: {
            icon: '🔓',
            label: 'Sin verificar',
            color: 'text-zinc-500',
            bg: 'bg-zinc-100 dark:bg-white/5',
            border: 'border-zinc-200 dark:border-white/10',
        },
        pending: {
            icon: '⏳',
            label: 'En revisión',
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-500/5',
            border: 'border-amber-500/20',
        },
        verified: {
            icon: '✅',
            label: 'Verificado',
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-500/5',
            border: 'border-emerald-500/20',
        },
        rejected: {
            icon: '❌',
            label: 'Rechazado',
            color: 'text-red-500',
            bg: 'bg-red-500/5',
            border: 'border-red-500/20',
        },
    };

    const config = statusConfig[status];

    return (
        <div className="space-y-4">
            {/* Verification Status Card */}
            <div className={`relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl shadow-lg border ${config.bg} ${config.border}`}>
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                                Estado de Vendedor
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${config.color} ${config.bg}`}>
                                {config.label}
                            </span>
                        </div>

                        {status === 'verified' && (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                                Tienes acceso completo al marketplace con beneficios Pro.
                            </p>
                        )}

                        {status === 'pending' && (
                            <p className="text-sm text-amber-700/80 dark:text-amber-400/80 mt-2">
                                Tu solicitud está siendo revisada. Te notificaremos pronto.
                            </p>
                        )}

                        {status === 'rejected' && (
                            <div className="mt-2">
                                <p className="text-sm text-red-600/80 dark:text-red-400/80">
                                    Verificación rechazada. {verification?.rejection_reason || 'Intenta con otro documento.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Verified badge decoration */}
                {status === 'verified' && verification?.verification_date && (
                    <p className="text-[10px] text-zinc-400 mt-3 text-right">
                        Verificado desde {new Date(verification.verification_date).toLocaleDateString('es-CO', {
                            day: 'numeric', month: 'long', year: 'numeric'
                        })}
                    </p>
                )}
            </div>

            {/* Escrow Mode Notice (for unverified/rejected users) */}
            {(status === 'unverified' || status === 'rejected') && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20"
                >
                    <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">ℹ️</span>
                        <div>
                            <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                                Actualmente operas en modo Escrow
                            </p>
                            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                                Verifícate para acceder a beneficios Pro: menor comisión, badge verificado, y prioridad en búsquedas.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Upload Documents Section */}
            {(status === 'unverified' || status === 'rejected') && (
                <div className="rounded-2xl p-6 bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-lg">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
                        Verificar mi cuenta
                    </h3>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                        Sube una foto de tu documento de identidad (cédula, pasaporte o licencia de conducir).
                        Esto nos ayuda a mantener la comunidad segura.
                    </p>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || submitting}
                        className="w-full py-4 rounded-xl border-2 border-dashed border-zinc-300 dark:border-white/20 
                            text-zinc-500 dark:text-zinc-400 hover:border-blue-500 hover:text-blue-500 
                            transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {uploading || submitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm font-bold">
                                    {uploading ? 'Subiendo...' : 'Enviando solicitud...'}
                                </span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" x2="12" y1="3" y2="15" />
                                </svg>
                                <span className="text-sm font-bold">Subir documento</span>
                            </>
                        )}
                    </button>

                    <AnimatePresence>
                        {success && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-emerald-600 dark:text-emerald-400 text-sm font-bold text-center mt-3"
                            >
                                ✅ Solicitud enviada — revisaremos tu documento pronto
                            </motion.p>
                        )}
                        {error && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-red-500 text-sm font-bold text-center mt-3"
                            >
                                {error}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
