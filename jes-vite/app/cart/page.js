'use client';
import { motion } from 'framer-motion';
import { useCart } from '@/src/context/CartContext';
import Header from '@/src/components/Header';
import Footer from '@/src/components/Footer';
import MobileTabBar from '@/src/components/MobileTabBar';
import Link from 'next/link';

export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, cartSubtotal, shippingCost, cartTotal, clearCart, isLoggedIn, startCheckout, isCheckingOut } = useCart();

    const personalItems = cart.filter(item => !item.isGift);
    const giftBags = cart.filter(item => item.isGift);

    const CartList = ({ items, title, icon }) => (
        <div className="space-y-6 mb-12">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 italic">
                {icon} {title}
            </h2>
            {items.map((item, idx) => (
                <motion.div
                    key={item.cartId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex gap-4 p-5 bg-zinc-900/50 rounded-[32px] border border-white/5 relative overflow-hidden group"
                >
                    <div className="w-24 h-24 bg-black rounded-2xl overflow-hidden shrink-0 border border-white/5">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                        <div className="space-y-1 pr-8">
                            <h3 className="font-bold text-sm leading-tight line-clamp-2">{item.title}</h3>
                            <p className="text-blue-500 font-black text-xs">{item.price}</p>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center bg-black/40 rounded-xl border border-white/5 overflow-hidden">
                                <button
                                    onClick={() => updateQuantity(item.cartId, -1)}
                                    className="px-4 py-2 hover:bg-white/10 active:scale-90 transition-all"
                                >
                                    -
                                </button>
                                <span className="px-3 text-xs font-black">{item.quantity}</span>
                                <button
                                    onClick={() => updateQuantity(item.cartId, 1)}
                                    className="px-4 py-2 hover:bg-white/10 active:scale-90 transition-all"
                                >
                                    +
                                </button>
                            </div>
                            <button
                                onClick={() => removeFromCart(item.cartId)}
                                className="p-3 bg-red-500/10 text-red-500 rounded-xl active:scale-90 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col text-white">
            <Header />

            <main className="flex-1 px-6 pt-32 pb-32 max-w-2xl mx-auto w-full">
                <header className="mb-12 space-y-2">
                    <h1 className="text-4xl font-black uppercase tracking-tighter italic text-white">Tu <span className="text-blue-500">Orden</span> 📦</h1>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                        {cart.length > 0 ? `Tienes ${cart.length} productos listos` : 'Tu carrito está vacío'}
                    </p>
                </header>

                <div className="space-y-2">
                    {cart.length > 0 ? (
                        <>
                            {personalItems.length > 0 && (
                                <CartList items={personalItems} title="Mi Carrito" icon="🛒" />
                            )}

                            {giftBags.length > 0 && (
                                <CartList items={giftBags} title="Mis Bolsas" icon="🎁" />
                            )}

                            <div className="pt-8 space-y-6">
                                <div className="p-8 bg-zinc-900 border border-white/5 rounded-[40px] space-y-6 shadow-2xl relative overflow-hidden">
                                    {!isLoggedIn && (
                                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-4">
                                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest text-center">
                                                🚀 <Link href="/profile" className="underline hover:text-blue-300">Inicia sesión</Link> para envío GRATIS
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-zinc-500">
                                            <span className="text-[10px] font-black uppercase tracking-widest">Subtotal</span>
                                            <span className="font-bold">{cartSubtotal.toLocaleString()} COP</span>
                                        </div>
                                        <div className="flex items-center justify-between text-zinc-500">
                                            <span className="text-[10px] font-black uppercase tracking-widest">Envío</span>
                                            <span className={`font-bold ${isLoggedIn ? 'text-green-500' : ''}`}>
                                                {isLoggedIn ? 'GRATIS' : `${shippingCost.toLocaleString()} COP`}
                                            </span>
                                        </div>
                                        <div className="h-px bg-white/5 my-2"></div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Total Estimado</span>
                                            <span className="text-3xl font-black text-white italic tracking-tighter">{cartTotal.toLocaleString()} COP</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <button
                                            onClick={startCheckout}
                                            disabled={isCheckingOut}
                                            className="w-full py-5 bg-white text-black rounded-[24px] font-black uppercase text-xs tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5 disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            {isCheckingOut ? 'Procesando...' : 'Pagar Ahora'}
                                        </button>
                                        <button
                                            onClick={clearCart}
                                            className="w-full py-5 bg-transparent border border-white/5 text-zinc-500 font-black uppercase text-[10px] tracking-widest rounded-[24px] hover:bg-white/5 transition-all"
                                        >
                                            Vaciar Carrito
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="py-24 text-center space-y-8 flex flex-col items-center">
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="text-8xl"
                            >
                                🥥
                            </motion.div>
                            <div className="space-y-4">
                                <h2 className="text-xl font-black uppercase tracking-tighter">Tu carrito está pelao</h2>
                                <p className="text-zinc-500 text-sm max-w-[250px] mx-auto leading-relaxed">Pásate por el inicio y busca algo que te trame, vale.</p>
                            </div>
                            <Link href="/" className="px-10 py-4 bg-blue-500 text-white font-black rounded-full uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Ir a la Tienda</Link>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
            <MobileTabBar />
        </div>
    );
}
