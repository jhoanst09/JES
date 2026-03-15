'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import MobileTabBar from '@/src/components/MobileTabBar';
import MarketplaceCommissionBanner from '@/src/components/MarketplaceCommissionBanner';
import { MARKETPLACE } from '@/src/config/marketplace.config';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function SellPage() {
    const { user } = useAuth();
    const { isLightMode } = useTheme();
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        price_fiat: '',
        price_jes_coin: '',
        stock: '1',
        condition: 'new',
        location: '',
    });
    const [selectedTags, setSelectedTags] = useState([]);
    const [images, setImages] = useState([]); // Array of { url, uploading, progress }
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleChange = useCallback((e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }, []);

    const toggleTag = useCallback((tag) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    }, []);

    // Image upload handler
    const handleImageUpload = useCallback(async (e) => {
        const files = Array.from(e.target.files || []);
        if (images.length + files.length > MAX_IMAGES) {
            setError(`Máximo ${MAX_IMAGES} imágenes`);
            return;
        }

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                setError(`${file.name} es muy grande. Máximo 10MB`);
                continue;
            }

            const tempId = Date.now() + Math.random();
            setImages(prev => [...prev, { id: tempId, url: URL.createObjectURL(file), uploading: true }]);

            try {
                // Get presigned URL
                const presignRes = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: file.name,
                        contentType: file.type,
                        folder: 'marketplace',
                    }),
                });
                const { uploadUrl, publicUrl } = await presignRes.json();

                // Upload to S3
                await fetch(uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type },
                });

                setImages(prev =>
                    prev.map(img => img.id === tempId
                        ? { ...img, url: publicUrl, uploading: false }
                        : img
                    )
                );
            } catch (err) {
                console.error('Upload failed:', err);
                setImages(prev => prev.filter(img => img.id !== tempId));
                setError('Error subiendo imagen');
            }
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [images]);

    const removeImage = useCallback((id) => {
        setImages(prev => prev.filter(img => img.id !== id));
    }, []);

    // Submit product
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user?.id) {
            setError('Debes iniciar sesión');
            return;
        }
        if (!form.title.trim() || !form.price_fiat) {
            setError('Título y precio son obligatorios');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/marketplace/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    seller_id: user.id,
                    title: form.title.trim(),
                    description: form.description.trim(),
                    price_fiat: parseFloat(form.price_fiat),
                    price_jes_coin: form.price_jes_coin ? parseFloat(form.price_jes_coin) : null,
                    stock: parseInt(form.stock) || 1,
                    category_tags: selectedTags,
                    images: images.filter(i => !i.uploading).map(i => i.url),
                    condition: form.condition,
                    location: form.location.trim() || null,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                setForm({ title: '', description: '', price_fiat: '', price_jes_coin: '', stock: '1', condition: 'new', location: '' });
                setSelectedTags([]);
                setImages([]);
            } else {
                setError(data.error || 'Error al publicar');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = `w-full px-4 py-3 rounded-xl border transition-all outline-none
        bg-white/5 dark:bg-white/5 
        border-zinc-200 dark:border-white/10
        text-zinc-900 dark:text-white
        placeholder:text-zinc-400 dark:placeholder:text-zinc-500
        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`;

    return (
        <>
            <Header />
            <main className="min-h-screen pt-28 pb-32 px-4 bg-zinc-50 dark:bg-black transition-colors">
                <div className="max-w-xl mx-auto">
                    {/* Title */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                            Vender en JES
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                            Publica tu producto y llega a toda la comunidad
                        </p>
                    </motion.div>

                    {/* Commission Banner */}
                    <MarketplaceCommissionBanner className="mb-8" />

                    {/* Success State */}
                    <AnimatePresence>
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="mb-8 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center"
                            >
                                <span className="text-4xl block mb-3">🎉</span>
                                <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    ¡Producto publicado!
                                </h3>
                                <p className="text-sm text-emerald-700/70 dark:text-emerald-400/70 mt-1">
                                    Tu producto ya está visible en el marketplace.
                                </p>
                                <button
                                    onClick={() => setSuccess(false)}
                                    className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors"
                                >
                                    Publicar otro
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form */}
                    {!success && (
                        <motion.form
                            onSubmit={handleSubmit}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-6"
                        >
                            {/* Glass Form Card */}
                            <div className="p-6 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-lg space-y-5">
                                {/* Images */}
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">
                                        Fotos del producto ({images.length}/{MAX_IMAGES})
                                    </label>
                                    <div className="flex gap-3 overflow-x-auto pb-2">
                                        {images.map(img => (
                                            <div key={img.id} className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-200 dark:border-white/10">
                                                <img src={img.url} alt="" className="w-full h-full object-cover" />
                                                {img.uploading && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(img.id)}
                                                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        {images.length < MAX_IMAGES && (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-20 h-20 rounded-xl border-2 border-dashed border-zinc-300 dark:border-white/20 flex items-center justify-center text-zinc-400 hover:border-blue-500 hover:text-blue-500 transition-colors flex-shrink-0"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 5v14" /><path d="M5 12h14" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Título</label>
                                    <input
                                        name="title"
                                        value={form.title}
                                        onChange={handleChange}
                                        placeholder="¿Qué estás vendiendo?"
                                        className={inputClass}
                                        required
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Descripción</label>
                                    <textarea
                                        name="description"
                                        value={form.description}
                                        onChange={handleChange}
                                        placeholder="Describe tu producto, estado, detalles..."
                                        rows={3}
                                        className={`${inputClass} resize-none`}
                                    />
                                </div>

                                {/* Price Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Precio (COP)</label>
                                        <input
                                            name="price_fiat"
                                            type="number"
                                            value={form.price_fiat}
                                            onChange={handleChange}
                                            placeholder="50.000"
                                            min="0"
                                            step="100"
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">JES Coins <span className="text-zinc-400">(opc.)</span></label>
                                        <input
                                            name="price_jes_coin"
                                            type="number"
                                            value={form.price_jes_coin}
                                            onChange={handleChange}
                                            placeholder="500"
                                            min="0"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                {/* Stock + Condition */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Stock</label>
                                        <input
                                            name="stock"
                                            type="number"
                                            value={form.stock}
                                            onChange={handleChange}
                                            min="1"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Condición</label>
                                        <select
                                            name="condition"
                                            value={form.condition}
                                            onChange={handleChange}
                                            className={inputClass}
                                        >
                                            <option value="new">Nuevo</option>
                                            <option value="like_new">Como nuevo</option>
                                            <option value="good">Buen estado</option>
                                            <option value="fair">Aceptable</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Ubicación</label>
                                    <input
                                        name="location"
                                        value={form.location}
                                        onChange={handleChange}
                                        placeholder="Ciudad o zona de entrega"
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            {/* Tags Card */}
                            <div className="p-6 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-lg">
                                <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">
                                    Categorías
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {MARKETPLACE.CATEGORIES.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleTag(tag)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedTags.includes(tag)
                                                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                                                    : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10 hover:border-blue-500/50'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-red-500 text-sm font-bold text-center"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            {/* Submit */}
                            <motion.button
                                type="submit"
                                disabled={submitting || images.some(i => i.uploading)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-4 rounded-2xl font-black text-base uppercase tracking-wider transition-all disabled:opacity-50
                                    bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                                    shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30"
                            >
                                {submitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Publicando...
                                    </span>
                                ) : 'Publicar Producto'}
                            </motion.button>
                        </motion.form>
                    )}
                </div>
            </main>
            <Footer />
            <MobileTabBar />
        </>
    );
}
