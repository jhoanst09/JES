import { createContext, useContext, useState, useEffect } from 'react';
import { useWishlist } from './WishlistContext';
import { createShopifyCheckout, getProductVariantId } from '../services/shopify';

const CartContext = createContext();

export function CartProvider({ children }) {
    const { isLoggedIn } = useWishlist();
    const SHIPPING_COST = 15000; // 15,000 COP

    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('jes-cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    useEffect(() => {
        localStorage.setItem('jes-cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = async (product) => {
        // If product doesn't have variantId, fetch it
        let variantId = product.variantId;
        if (!variantId && product.handle) {
            const variantData = await getProductVariantId(product.handle);
            variantId = variantData?.variantId || null;
        }

        setCart(prev => {
            const existing = prev.find(item => item.handle === product.handle);
            if (existing) {
                return prev.map(item =>
                    item.handle === product.handle
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, variantId, quantity: 1 }];
        });
        setIsCartOpen(true);
    };

    const removeFromCart = (handle) => {
        setCart(prev => prev.filter(item => item.handle !== handle));
    };

    const updateQuantity = (handle, delta) => {
        setCart(prev => prev.map(item => {
            if (item.handle === handle) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

    const cartSubtotal = cart.reduce((total, item) => {
        // Remove dots (thousand separators) and currency symbols before parsing
        const cleanPrice = item.price.replace(/[$. ]/g, '');
        const price = parseFloat(cleanPrice) || 0;
        return total + (price * item.quantity);
    }, 0);

    const shippingCost = isLoggedIn ? 0 : (cart.length > 0 ? SHIPPING_COST : 0);
    const cartTotal = cartSubtotal + shippingCost;

    const clearCart = () => setCart([]);

    const startCheckout = async () => {
        if (cart.length === 0) return;

        setIsCheckingOut(true);

        try {
            // Ensure all items have variantIds
            const itemsWithVariants = await Promise.all(
                cart.map(async (item) => {
                    if (item.variantId) {
                        return { variantId: item.variantId, quantity: item.quantity };
                    }
                    // Fetch variant if missing
                    const variantData = await getProductVariantId(item.handle);
                    return {
                        variantId: variantData?.variantId,
                        quantity: item.quantity
                    };
                })
            );

            // Filter out items without variants
            const validItems = itemsWithVariants.filter(item => item.variantId);

            if (validItems.length === 0) {
                alert('No se pudieron procesar los productos. Intenta de nuevo.');
                setIsCheckingOut(false);
                return;
            }

            const checkout = await createShopifyCheckout(validItems);

            if (checkout?.checkoutUrl) {
                // Redirect to Shopify checkout
                window.location.href = checkout.checkoutUrl;
            } else {
                alert('Error al crear el checkout. Intenta de nuevo.');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Error al procesar el pago. Intenta de nuevo.');
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            cartCount,
            cartSubtotal,
            shippingCost,
            cartTotal,
            clearCart,
            isCartOpen,
            setIsCartOpen,
            isLoggedIn,
            startCheckout,
            isCheckingOut
        }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);

