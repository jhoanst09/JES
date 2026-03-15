/**
 * JES Marketplace Configuration
 * 
 * Central config for commission rates, supported currencies,
 * and marketplace business rules.
 */

export const MARKETPLACE = {
    // Commission rate (1%)
    COMMISSION_RATE: 0.01,

    // Commission narrative message
    COMMISSION_MESSAGE: 'JES crece si tú creces: cobramos el mínimo para que tu emprendimiento llegue más lejos',

    // Supported currencies
    CURRENCIES: ['FIAT', 'JES_COIN', 'BTC'],

    // Product statuses
    PRODUCT_STATUSES: ['active', 'paused', 'sold_out'],

    // Escrow statuses  
    ESCROW_STATUSES: ['pending_payment', 'held', 'completed', 'disputed', 'refunded', 'cancelled'],

    // Seller verification statuses
    SELLER_STATUSES: ['unverified', 'pending', 'verified', 'rejected'],

    // Product conditions
    CONDITIONS: ['new', 'like_new', 'good', 'fair'],

    // Category presets for quick tagging
    CATEGORIES: [
        'electrónica', 'ropa', 'zapatos', 'accesorios', 'música',
        'gaming', 'deportes', 'hogar', 'libros', 'arte',
        'tecnología', 'coleccionables', 'instrumentos', 'otros'
    ],

    /**
     * Calculate commission for a transaction amount
     * @param {number} amount - Transaction amount
     * @returns {{ commission: number, sellerReceives: number }}
     */
    calculateCommission(amount) {
        const commission = Math.round(amount * this.COMMISSION_RATE * 100) / 100;
        return {
            commission,
            sellerReceives: Math.round((amount - commission) * 100) / 100
        };
    }
};

export default MARKETPLACE;
