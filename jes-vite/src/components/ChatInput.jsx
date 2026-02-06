'use client';
import { useState, useCallback, memo } from 'react';
import FileUploadButton from './FileUploadButton';

/**
 * ChatInput Component
 * 
 * Features:
 * - Local state for smooth typing
 * - S3 file uploads via FileUploadButton
 * - Shopify product sharing
 * - Pending product preview
 */
const ChatInput = memo(function ChatInput({
    onSend,
    onTyping,
    onFileUpload,
    onProductShare,
    disabled = false
}) {
    const [localInput, setLocalInput] = useState('');
    const [uploading, setUploading] = useState(false);
    const [pendingProduct, setPendingProduct] = useState(null);

    const handleChange = useCallback((e) => {
        setLocalInput(e.target.value);
        onTyping?.();
    }, [onTyping]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        // If there's a pending product, send it
        if (pendingProduct) {
            await onSend?.(pendingProduct.url, 'product');
            setPendingProduct(null);
            return;
        }

        // Otherwise send text
        const text = localInput.trim();
        if (!text) return;

        setLocalInput('');
        await onSend?.(text);
    }, [localInput, pendingProduct, onSend]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    }, [handleSubmit]);

    // Handle S3 file upload completion
    const handleFileUpload = useCallback(async (file, type, url) => {
        setUploading(true);
        try {
            await onFileUpload?.(file, type, url);
        } finally {
            setUploading(false);
        }
    }, [onFileUpload]);

    // Handle Shopify product selection
    const handleProductShare = useCallback((productUrl, product) => {
        setPendingProduct({
            url: productUrl,
            product: product
        });
        onProductShare?.(productUrl, product);
    }, [onProductShare]);

    const cancelProduct = useCallback(() => {
        setPendingProduct(null);
    }, []);

    return (
        <div className="border-t border-zinc-800">
            {/* Pending product preview */}
            {pendingProduct && (
                <div className="p-3 bg-zinc-900/50 border-b border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-400">📦 Compartiendo producto:</span>
                        <button
                            onClick={cancelProduct}
                            className="text-zinc-500 hover:text-white text-xs"
                        >
                            ✕ Cancelar
                        </button>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg">
                        <img
                            src={pendingProduct.product?.images?.edges?.[0]?.node?.url || '/placeholder.jpg'}
                            alt={pendingProduct.product?.title}
                            className="w-10 h-10 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{pendingProduct.product?.title}</p>
                            <p className="text-xs text-green-400">
                                ${pendingProduct.product?.priceRange?.minVariantPrice?.amount}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Input form */}
            <form onSubmit={handleSubmit} className="p-4 flex items-center gap-3">
                <FileUploadButton
                    onUpload={handleFileUpload}
                    onProductShare={handleProductShare}
                    onBagCreated={(bagUrl, bag) => {
                        onSend?.(bagUrl, 'bag');
                    }}
                    disabled={disabled}
                    uploading={uploading}
                />

                <input
                    type="text"
                    value={localInput}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        uploading ? "Subiendo archivo..." :
                            pendingProduct ? "Presiona Enter para compartir..." :
                                "Escribe un mensaje..."
                    }
                    disabled={disabled}
                    autoComplete="off"
                    className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-full text-white text-sm focus:outline-none focus:border-white/50 disabled:opacity-50 transition-colors"
                />

                <button
                    type="submit"
                    disabled={(!localInput.trim() && !pendingProduct) || disabled}
                    className="p-3 bg-white text-black rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-transform"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>
        </div>
    );
});

export default ChatInput;
