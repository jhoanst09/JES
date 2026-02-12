import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { createShopifyCheckout, getProductVariantId } from '../services/shopify';

const CartContext = createContext();

export function CartProvider({ children }) {
    const { user, isLoggedIn } = useAuth();
    const { showToast } = useToast();
    const SHIPPING_COST = 15000; // 15,000 COP

    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [loading, setLoading] = useState(false);

    // ==========================================
    // FETCH CART FROM RDS
    // ==========================================
    const fetchCart = useCallback(async () => {
        if (!isLoggedIn || !user?.id) {
            setCart([]);
            return;
        }

        try {
            const res = await fetch('/api/cart');
            if (res.ok) {
                const { items } = await res.json();
                setCart(items || []);
            }
        } catch (error) {
            console.error('Failed to fetch cart:', error);
        }
    }, [isLoggedIn, user?.id]);

    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    // ==========================================
    // ADD TO CART (RDS + Optimistic Update)
    // ==========================================
    const addToCart = useCallback(async (product, isGift = false) => {
        if (!isLoggedIn) {
            showToast('Inicia sesión para añadir al carrito', 'info');
            return;
        }

        // Fetch variant ID if needed
        let variantId = product.variantId;
        if (!variantId && product.handle) {
            const variantData = await getProductVariantId(product.handle);
            variantId = variantData?.variantId || null;
        }

        const cartId = `${product.handle}${isGift ? '-gift' : ''}`;

        // Optimistic update
        setCart(prev => {
            const existing = prev.find(item => item.product_handle === product.handle);
            if (existing) {
                return prev.map(item =>
                    item.product_handle === product.handle
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, {
                product_handle: product.handle,
                quantity: 1,
                ...product,
                variantId,
                isGift,
                cartId
            }];
        });

        // Show toast immediately
        showToast('Producto añadido al carrito 🛒', 'success');
        setIsCartOpen(true);

        // Persist to RDS
        try {
            await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productHandle: product.handle,
                    quantity: 1
                })
            });
        } catch (error) {
            console.error('Failed to add to cart:', error);
            setCart(prev => prev.filter(item => item.product_handle !== product.handle));
            showToast('Error al añadir al carrito', 'error');
        }
    }, [isLoggedIn, showToast]);

    // ==========================================
    // REMOVE FROM CART
    // ==========================================
    const removeFromCart = useCallback(async (productHandle) => {
        const prevCart = cart;
        setCart(prev => prev.filter(item => item.product_handle !== productHandle));

        try {
            await fetch('/api/cart', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productHandle })
            });
            showToast('Producto eliminado del carrito', 'info');
        } catch (error) {
            setCart(prevCart);
            showToast('Error al eliminar producto', 'error');
        }
    }, [cart, showToast]);

    // ==========================================
    // UPDATE QUANTITY
    // ==========================================
    const updateQuantity = useCallback((productHandle, delta) => {
        setCart(prev => prev.map(item => {
            if (item.product_handle === productHandle) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));

        fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productHandle,
                quantity: delta
            })
        }).catch(console.error);
    }, []);

    // ==========================================
    // CART CALCULATIONS
    // ==========================================
    const cartCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);

    const cartSubtotal = cart.reduce((total, item) => {
        const price = parseFloat(item.priceRange?.minVariantPrice?.amount || item.price?.replace(/[$.]/g, '') || 0);
        return total + (price * (item.quantity || 1));
    }, 0);

    const shippingCost = isLoggedIn ? 0 : (cart.length > 0 ? SHIPPING_COST : 0);
    const cartTotal = cartSubtotal + shippingCost;

    // ==========================================
    // CLEAR CART
    // ==========================================
    const clearCart = useCallback(async () => {
        setCart([]);
        try {
            await fetch('/api/cart', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clearAll: true })
            });
        } catch (error) {
            console.error('Failed to clear cart:', error);
        }
    }, []);

    // ==========================================
    // CHECKOUT
    // ==========================================
    const startCheckout = async () => {
        if (cart.length === 0) return;

        setIsCheckingOut(true);

        try {
            const itemsWithVariants = await Promise.all(
                cart.map(async (item) => {
                    if (item.variantId) {
                        return { variantId: item.variantId, quantity: item.quantity || 1 };
                    }
                    const variantData = await getProductVariantId(item.product_handle || item.handle);
                    return {
                        variantId: variantData?.variantId,
                        quantity: item.quantity || 1
                    };
                })
            );

            const result = await createShopifyCheckout(itemsWithVariants);
            if (result?.checkoutUrl) {
                window.location.href = result.checkoutUrl;
            } else {
                showToast('No se pudo crear el checkout. Intenta de nuevo.', 'error');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            showToast('Error al procesar checkout', 'error');
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <CartContext.Provider value={{
            cart,
            cartCount,
            cartSubtotal,
            cartTotal,
            shippingCost,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            isCartOpen,
            setIsCartOpen,
            startCheckout,
            isCheckingOut,
            loading
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}
