'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getProducts } from '../services/shopify';
import Image from 'next/image';

export default function ProductPicker({ onSelect, onClose }) {
    const [mounted, setMounted] = useState(false);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setMounted(true);
        console.log('📦 ProductPicker mounted');
        const fetchItems = async () => {
            setLoading(true);
            const data = await getProducts(20);
            setProducts(data);
            setLoading(false);
        };
        fetchItems();
    }, []);

    const filtered = products.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[40px] shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Etiquetar Producto</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:scale-110 transition-transform">✕</button>
                </div>

                <div className="p-4">
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar en la tienda..."
                            className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col gap-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-2xl" />
                            ))}
                        </div>
                    ) : filtered.length > 0 ? (
                        filtered.map(product => (
                            <button
                                key={product.id}
                                onClick={() => onSelect(product)}
                                className="w-full flex gap-4 p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left group"
                            >
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 relative border border-black/5 dark:border-white/5">
                                    {product.image && (
                                        <Image src={product.image} fill sizes="64px" className="object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                    )}
                                </div>
                                <div className="flex-1 py-1">
                                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-1 lowercase italic">@{product.title}</h4>
                                    <p className="text-blue-600 font-black text-xs mt-1">{product.price}</p>
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-0.5">{product.type}</p>
                                </div>
                                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="bg-blue-600 text-white p-2 rounded-full text-xs">➕</span>
                                </div>
                            </button>
                        ))
                    ) : (
                        <p className="text-center py-10 text-zinc-500 text-sm italic">No encontramos ese producto...</p>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
