import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { createJesCheckout, openWompiCheckout, getProductVariantId } from '../services/jescore';

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
    // FETCH CART FROM JES Core (RDS)
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

        // Resolve variant ID from JES Core
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

        // Show toast immediately (optimistic)
        showToast('Producto añadido al carrito 🛒', 'success');
        setIsCartOpen(true);

        // Persist to RDS via Next.js API route → JES Core
        try {
            await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productHandle: product.handle,
                    variantId,
                    quantity: 1,
                    isGift,
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
        // Support both JES Core format (priceRaw in centavos) and legacy display price
        let price = 0;
        if (item.priceRaw) {
            // JES Core: centavos → pesos
            price = item.priceRaw / 100;
        } else if (item.price) {
            // Legacy: parse display price string "$120.000" → 120000
            price = parseFloat(String(item.price).replace(/[$.,\s]/g, '')) || 0;
        }
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
    // CHECKOUT — JES Core → Wompi
    // ==========================================
    const startCheckout = async () => {
        if (cart.length === 0) return;
        if (!isLoggedIn || !user?.id) {
            showToast('Inicia sesión para proceder con la compra', 'info');
            return;
        }

        setIsCheckingOut(true);

        try {
            // 1. Resolve variant IDs for all cart items
            const itemsWithVariants = await Promise.all(
                cart.map(async (item) => {
                    let variantId = item.variantId;
                    if (!variantId && (item.product_handle || item.handle)) {
                        const variantData = await getProductVariantId(item.product_handle || item.handle);
                        variantId = variantData?.variantId;
                    }
                    return {
                        variantId,
                        quantity: item.quantity || 1,
                        isGift: item.isGift || false,
                        giftMessage: item.giftMessage || null,
                    };
                })
            );

            // Filter out items without variant IDs
            const validItems = itemsWithVariants.filter(i => i.variantId);
            if (validItems.length === 0) {
                showToast('No se pudieron resolver los productos. Intenta de nuevo.', 'error');
                return;
            }

            // 2. Create order in JES Core (reserves inventory atomically)
            const result = await createJesCheckout({
                customerId: user.id,
                items: validItems,
                shippingAddress: user.shippingAddress || {},
                customerNotes: '',
            });

            if (!result?.redirectInfo) {
                showToast('No se pudo crear la orden. Intenta de nuevo.', 'error');
                return;
            }

            // 3. Redirect to Wompi payment widget
            openWompiCheckout(result.redirectInfo);

        } catch (error) {
            console.error('Checkout error:', error);
            showToast('Error al procesar checkout', 'error');
        } finally {
            setIsCheckingOut(false);
        }
    };

    // ==========================================
    // BUY NOW — Single product × Wompi
    // Does NOT touch the cart at all
    // ==========================================
    const buyNow = async (product) => {
        if (!product?.handle) return;
        if (!isLoggedIn || !user?.id) {
            showToast('Inicia sesión para comprar', 'info');
            return;
        }

        setIsCheckingOut(true);
        try {
            // 1. Resolve variant ID
            let variantId = product.variantId;
            if (!variantId) {
                const variantData = await getProductVariantId(product.handle);
                variantId = variantData?.variantId;
            }

            if (!variantId) {
                showToast('No se pudo obtener el producto. Intenta de nuevo.', 'error');
                return;
            }

            // 2. Create single-item order in JES Core
            const result = await createJesCheckout({
                customerId: user.id,
                items: [{ variantId, quantity: 1, isGift: false }],
                shippingAddress: user.shippingAddress || {},
            });

            if (!result?.redirectInfo) {
                showToast('No se pudo crear la orden. Intenta de nuevo.', 'error');
                return;
            }

            // 3. Redirect to Wompi
            openWompiCheckout(result.redirectInfo);

        } catch (error) {
            console.error('Buy now error:', error);
            showToast('Error al procesar compra', 'error');
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
            buyNow,
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
