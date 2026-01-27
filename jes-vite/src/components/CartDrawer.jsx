import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';

export default function CartDrawer() {
    const { cart, removeFromCart, updateQuantity, cartTotal, isCartOpen, setIsCartOpen, clearCart, startCheckout, isCheckingOut } = useCart();

    return (
        <AnimatePresence>
            {isCartOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsCartOpen(false)}
                        className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-md z-[120] bg-zinc-950 border-l border-white/5 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Tus <span className="text-blue-500">Regalos</span> 🎁</h2>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Tienes {cart.length} vales esperando</p>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-3 bg-white/5 hover:bg-white text-white hover:text-black rounded-full transition-all active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            {cart.length > 0 ? (
                                cart.map((item, idx) => (
                                    <motion.div
                                        key={item.handle}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="flex gap-4 p-4 bg-white/5 rounded-3xl border border-white/5 hover:border-white/10 transition-all group"
                                    >
                                        <div className="w-24 h-24 bg-black rounded-2xl overflow-hidden flex-shrink-0 border border-white/5">
                                            <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            <div className="space-y-1">
                                                <h3 className="font-bold text-sm line-clamp-1">{item.title}</h3>
                                                <p className="text-blue-500 font-black text-xs">{item.price}</p>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center bg-black/50 rounded-xl border border-white/5 overflow-hidden">
                                                    <button
                                                        onClick={() => updateQuantity(item.handle, -1)}
                                                        className="px-3 py-1 hover:bg-white/10 transition-colors"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="px-3 text-xs font-bold">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.handle, 1)}
                                                        className="px-3 py-1 hover:bg-white/10 transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.handle)}
                                                    className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                                    <span className="text-6xl">🥥</span>
                                    <p className="font-black uppercase tracking-widest text-[10px]">Cero cocos por ahora, vale.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-zinc-900 border-t border-white/5 space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Total Estimado</span>
                                <span className="text-2xl font-black text-white">$ {cartTotal.toLocaleString()} COP</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={clearCart}
                                    className="py-4 rounded-2xl border border-white/5 text-zinc-500 font-black uppercase text-[10px] tracking-widest hover:bg-white/5 transition-all"
                                >
                                    Vaciar
                                </button>
                                <button
                                    onClick={startCheckout}
                                    disabled={cart.length === 0 || isCheckingOut}
                                    className="py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {isCheckingOut ? 'Procesando...' : 'Pagar Ahora'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
