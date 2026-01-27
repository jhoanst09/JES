import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProductByHandle, getRelatedProducts } from '../services/shopify';
import ProductCard from '../components/ProductCard';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import VirtualMirror from '../components/VirtualMirror';
import PurchaseTerminal from '../components/PurchaseTerminal';
import { useTerminal } from '../context/TerminalContext';

export default function ProductDetails() {
    const { handle } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [wantsPrivate, setWantsPrivate] = useState(false);
    const [showMirror, setShowMirror] = useState(false);
    const { openTerminal } = useTerminal();
    const [relatedProducts, setRelatedProducts] = useState([]);
    const { toggleWishlist, isInWishlist, addToWishlist, isLoggedIn } = useWishlist();
    const { addToCart } = useCart();

    useEffect(() => {
        async function fetchProduct() {
            setLoading(true);
            try {
                const data = await getProductByHandle(handle);
                setProduct(data);

                // Auto-sync with MusicPlayer suppressed for now
                if (data) {
                    const searchStr = `${data.title} ${data.type} ${data.tags?.join(' ') || ''} ${data.vendor || ''}`.toLowerCase();
                    const accessories = ['tocadiscos', 'soporte', 'estante', 'maleta', 'limpiador', 'cepillo', 'mesa', 'mueble', 'flipper', 'stand', 'base', 'mount', 'limpieza'];
                    const isAccessory = accessories.some(kw => searchStr.includes(kw));
                    const isMusic = (searchStr.includes('vinilo') || searchStr.includes('lp') || searchStr.includes('disco') || searchStr.includes('artaud') || searchStr.includes('fania') || searchStr.includes('album') || searchStr.includes('spinetta') || searchStr.includes('música') || searchStr.includes('music')) && !isAccessory;

                    if (isMusic) {
                        /* Music Player Suppressed
                        let finalArtist = data.vendor;
                        if (!finalArtist || finalArtist === "Jes Store Artist") {
                            if (data.title.toLowerCase().includes('artaud')) finalArtist = "Pescado Rabioso";
                            else if (data.title.includes(' - ')) finalArtist = data.title.split(' - ')[0].trim();
                            else finalArtist = data.type || "Artist";
                        }

                        window.dispatchEvent(new CustomEvent('play-track', {
                            detail: {
                                title: data.title,
                                artist: finalArtist,
                                cover: data.image || data.images[0],
                                autoLoad: true
                            }
                        }));
                        */
                    }
                }
            } catch (error) {
                console.error('Error fetching product:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchProduct();
        window.scrollTo(0, 0);
    }, [handle]);

    // Fetch related products separately
    useEffect(() => {
        const fetchRelated = async () => {
            try {
                // Try fetching by type first
                let items = await getRelatedProducts(product?.type, 8);

                // If no items or only the current one, fetch any products as fallback
                if (!items || items.length <= 1) {
                    items = await getProducts(8);
                }

                // Filter out current product and take top 4
                const filtered = items.filter(p => p.handle !== handle).slice(0, 4);
                setRelatedProducts(filtered);
            } catch (err) {
                console.error("Error fetching related:", err);
            }
        };

        if (product) {
            fetchRelated();
        }
    }, [product, handle]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-white p-6">
                <h1 className="text-4xl font-bold mb-4">Producto no encontrado</h1>
                <p className="text-gray-400 mb-8">Lo sentimos, no pudimos encontrar el producto que buscas.</p>
                <Link to="/" className="px-8 py-3 bg-white text-black font-bold rounded-full">Volver al inicio</Link>
            </div>
        );
    }

    const inWishlist = isInWishlist(product.id);

    return (
        <div className="min-h-screen selection:bg-blue-500/30">
            <Header />

            <main className="max-w-[1400px] mx-auto px-6 pt-32 pb-24">
                <div className="flex flex-col lg:flex-row gap-16">
                    {/* Media Gallery */}
                    <div className="flex-1 space-y-4">
                        <div
                            className="aspect-square bg-zinc-900 rounded-[40px] overflow-hidden border border-white/5"
                        >
                            <img
                                src={product.images[selectedImage] || product.image}
                                alt={product.title}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {product.images.length > 1 && (
                            <div className="grid grid-cols-4 gap-4">
                                {product.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(idx)}
                                        className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${selectedImage === idx ? 'border-blue-500 scale-95' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="lg:w-[450px] space-y-10">
                        <div className="space-y-4">
                            <span
                                className="text-blue-500 font-bold tracking-widest text-sm uppercase"
                            >
                                {product.type || 'Colección'}
                            </span>
                            <h1
                                className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white font-bricolage leading-tight transition-colors"
                            >
                                {product.title}
                            </h1>
                            <p
                                className="text-2xl font-medium text-zinc-500 dark:text-white/60 transition-colors"
                            >
                                {product.price}
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="prose prose-invert prose-sm max-w-none text-gray-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.descriptionHtml || product.description }} />

                            <div className="flex flex-wrap gap-2 pt-4">
                                {product.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-400 uppercase tracking-widest">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-8">
                            <button
                                onClick={() => addToCart({
                                    handle: product.handle,
                                    title: product.title,
                                    price: product.price,
                                    image: product.image || product.images[0]
                                })}
                                className="w-full py-5 bg-white text-black font-black rounded-full hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest"
                            >
                                Añadir al Carrito
                            </button>

                            {product && ['espejo', 'mirror', 'glass', 'cristal', 'reflejo'].some(key => `${product.title} ${product.type} ${product.tags?.join(' ')}`.toLowerCase().includes(key)) && (
                                <button
                                    onClick={() => setShowMirror(true)}
                                    className="w-full py-5 bg-blue-500 text-white font-black rounded-full hover:bg-blue-600 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3 group shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                                    Probar Espejo Virtual
                                </button>
                            )}

                            <button
                                onClick={() => openTerminal(product)}
                                className="w-full py-5 bg-zinc-900 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 font-black rounded-full border border-black/10 dark:border-white/10 hover:bg-zinc-800 transition-all text-sm uppercase tracking-widest"
                            >
                                Comprar Ahora
                            </button>

                            <div className="pt-4 flex flex-col gap-4">
                                <button
                                    onClick={() => {
                                        if (!isLoggedIn) {
                                            // Redirect to profile for login - no alert
                                            navigate('/profile', { state: { returnTo: `/product/${handle}`, message: 'Inicia sesión para guardar productos en tu lista de deseos' } });
                                            return;
                                        }
                                        if (!inWishlist) {
                                            addToWishlist(product, wantsPrivate);
                                        } else {
                                            toggleWishlist(product);
                                        }
                                    }}
                                    className={`w-full py-5 rounded-full border transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 font-bold ${inWishlist
                                        ? 'bg-blue-600/10 border-blue-500/50 text-blue-500'
                                        : 'bg-transparent border-black/10 dark:border-white/10 text-zinc-500 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={inWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                                    {inWishlist ? 'En Lista de Deseos' : 'Añadir a Deseos'}
                                </button>

                                {!inWishlist && (
                                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                                        <button
                                            onClick={() => setWantsPrivate(false)}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${!wantsPrivate ? 'bg-white text-black shadow-lg' : 'text-zinc-500'}`}
                                        >
                                            🌍 Público
                                        </button>
                                        <button
                                            onClick={() => setWantsPrivate(true)}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${wantsPrivate ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500'}`}
                                        >
                                            🔒 Privado
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Extra info/Benefits */}
                        <div className="grid grid-cols-2 gap-4 pt-10 border-t border-white/10">
                            <div className="flex flex-col gap-1">
                                <span className="text-zinc-900 dark:text-white text-xs font-bold uppercase transition-colors">Envío Gratis</span>
                                <span className="text-zinc-500 text-[10px]">Para miembros registrados</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-zinc-900 dark:text-white text-xs font-bold uppercase transition-colors">Pago Seguro</span>
                                <span className="text-zinc-500 text-[10px]">Cifrado de 256 bits</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Related Products Section - Moved UP */}
                {relatedProducts.length > 0 && (
                    <div className="mt-40 space-y-12">
                        <div className="flex flex-col md:flex-row justify-between items-end gap-6 transition-colors">
                            <div className="space-y-4">
                                <h2 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white font-bricolage tracking-tight uppercase italic transition-colors">
                                    También <span className="text-blue-500">Podría Gustarte</span>
                                </h2>
                                <p className="text-zinc-500 dark:text-white/40 font-medium text-lg max-w-xl transition-colors">
                                    Mira estos otros que también tienen todo el estilo de la comunidad.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-8 overflow-x-auto pb-12 snap-x no-scrollbar">
                            {relatedProducts.map((rp) => (
                                <div key={rp.id} className="min-w-[280px] md:min-w-[320px] snap-start">
                                    <ProductCard
                                        handle={rp.handle}
                                        nombre={rp.title}
                                        precio={rp.price}
                                        image={rp.image}
                                        className="scale-95 hover:scale-100 transition-transform"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Social Proof: Cómo lo están usando los demás */}
                <div className="mt-40 space-y-12 pb-40">
                    <div className="space-y-4 text-center">
                        <h2 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white font-bricolage tracking-tighter uppercase italic">
                            Cómo lo están <span className="text-blue-500 underline decoration-wavy underline-offset-8">usando los demás</span>
                        </h2>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl mx-auto">
                            Tómate tu foto, súbela y menciona a <span className="font-bold text-zinc-900 dark:text-white">@JesStore</span> para aparecer en la vuelta.
                        </p>
                        <button className="px-8 py-3 border border-black dark:border-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all">Sube tu Foto</button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="aspect-[4/5] bg-zinc-100 dark:bg-zinc-900 rounded-[32px] overflow-hidden group relative">
                                <img
                                    src={`https://images.unsplash.com/photo-${i === 1 ? '1523275335684-37898b6baf30' : i === 2 ? '1505740420928-5e560c06d30e' : i === 3 ? '1526170375885-4d8ecbc60583' : '1491553895911-0055eca6402d'}?auto=format&fit=crop&q=80&w=800`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                                    alt=""
                                />
                                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-white text-[10px] font-bold tracking-widest uppercase">@usuario_{i}5</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
            <MobileTabBar />

            <VirtualMirror
                isOpen={showMirror}
                onClose={() => setShowMirror(false)}
                productImage={product.image || product.images[0]}
                productName={product.title}
            />
        </div>
    );
}
