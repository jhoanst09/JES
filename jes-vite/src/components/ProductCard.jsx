import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function ProductCard({ emoji, nombre, precio, image, handle, className = '' }) {
    const { addToCart } = useCart();

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart({ handle, title: nombre, price: precio, image });
    };

    return (
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

                {/* Hover Add to Cart Button */}
                <div className="absolute inset-x-0 bottom-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleAddToCart}
                        className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:text-white"
                    >
                        Regalar 🎁
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
    );
}
