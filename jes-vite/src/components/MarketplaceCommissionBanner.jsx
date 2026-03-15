'use client';

import { MARKETPLACE } from '../config/marketplace.config';

/**
 * MarketplaceCommissionBanner
 * 
 * Glassmorphism banner showing the JES marketplace commission message.
 * Reusable in product creation, checkout, and seller dashboard.
 */
export default function MarketplaceCommissionBanner({ className = '' }) {
    return (
        <div className={`relative overflow-hidden rounded-2xl ${className}`}>
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 shadow-lg">
                {/* Subtle gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 rounded-t-2xl" />

                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">🤝</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                Solo {MARKETPLACE.COMMISSION_RATE * 100}% comisión
                            </span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {MARKETPLACE.COMMISSION_MESSAGE}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
