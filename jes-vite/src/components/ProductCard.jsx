import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function ProductCard({ emoji, nombre, precio, image, handle, className = '' }) {
    const { addToCart } = useCart();
    const { friends, isLoggedIn } = useWishlist();
    const [showGiftModal, setShowGiftModal] = useState(false);

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart({ handle, title: nombre, price: precio, image });
    };

    const handleGiftClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoggedIn) {
            alert('¡Inicia sesión para enviar regalos!');
            return;
        }
        setShowGiftModal(true);
    };

    const handleSelectFriend = (friendId) => {
        // TODO: Implement gift sending logic
        alert(`¡Regalo enviado a tu amigo! 🎁`);
        setShowGiftModal(false);
    };

    return (
        <>
            <Link to={`/product/${handle}`} className={`group cursor-pointer flex flex-col h-full bg-transparent ${className}`}>
                {/* Imagen del producto */}
                <div className="aspect-square bg-transparent rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
                    {image ? (
                        <img
                            src={image}
                            alt={nombre}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <span className="text-7xl group-hover:scale-110 transition-transform duration-300">
                            {emoji || '📦'}
                        </span>
                    )}

                    {/* Hover Buttons */}
                    <div className="absolute inset-x-0 bottom-4 px-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-center">
                        <button
                            onClick={handleAddToCart}
                            className="w-12 h-12 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white rounded-full text-xl flex items-center justify-center transition-all hover:bg-blue-600 hover:text-white border border-black/10 dark:border-white/10 shadow-lg hover:scale-110 active:scale-95"
                            title="Añadir al carrito"
                        >
                            🛒
                        </button>
                        <button
                            onClick={handleGiftClick}
                            className="w-12 h-12 bg-blue-600 text-white rounded-full text-xl flex items-center justify-center transition-all hover:bg-blue-700 shadow-lg hover:scale-110 active:scale-95"
                            title="Regalar a un amigo"
                        >
                            🎁
                        </button>
                    </div>
                </div>

                <div className="space-y-2 flex-1 flex flex-col px-1">
                    <h3 className="text-sm md:text-base font-bold text-zinc-800 dark:text-white/90 group-hover:text-black dark:group-hover:text-white transition-colors line-clamp-2 uppercase tracking-tight">
                        {nombre}
                    </h3>
                    <p className="text-base md:text-lg text-blue-500 font-black mt-auto">
                        {precio}
                    </p>
                </div>
            </Link>

            {/* Gift Modal */}
            {showGiftModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowGiftModal(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-black/5 dark:border-white/10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-2">
                            Regalar a un Amigo 🎁
                        </h3>
                        <p className="text-sm text-zinc-500 mb-6">{nombre}</p>

                        {friends && friends.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {friends.map((friend) => (
                                    <button
                                        key={friend.id}
                                        onClick={() => handleSelectFriend(friend.id)}
                                        className="w-full flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-left"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                                            {friend.avatar_url ? (
                                                <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-lg">👤</span>
                                            )}
                                        </div>
                                        <span className="font-bold text-zinc-900 dark:text-white">{friend.name}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <span className="text-4xl mb-4 block">😢</span>
                                <p className="text-zinc-500 text-sm">Aún no tienes amigos. ¡Añade algunos primero!</p>
                            </div>
                        )}

                        <button
                            onClick={() => setShowGiftModal(false)}
                            className="w-full mt-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl font-bold text-xs uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
