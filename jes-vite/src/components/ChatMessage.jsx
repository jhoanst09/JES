'use client';
import { memo } from 'react';
import { motion } from 'framer-motion';
import { ChatProductCard, isShopifyProduct } from './ProductCard';
import { ChatBagCard } from './BagCard';
import { isBagLink } from '@/src/utils/bags';

/**
 * ChatMessage Component
 * 
 * Renders different message types:
 * - Text messages (possibly encrypted)
 * - Media URLs (images, videos) - NOT encrypted for preview
 * - Shopify products (shopify:// URLs)
 */
const ChatMessage = memo(function ChatMessage({
    message,
    isOwn,
    senderName,
    senderAvatar,
    timestamp
}) {
    const content = message.content || '';
    const messageType = detectMessageType(content);

    // Time formatter
    const formattedTime = new Date(timestamp).toLocaleTimeString('es', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} mb-3`}
        >
            {/* Avatar */}
            {!isOwn && (
                <div className="flex-shrink-0">
                    {senderAvatar ? (
                        <img
                            src={senderAvatar}
                            alt={senderName}
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                            {senderName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    )}
                </div>
            )}

            {/* Message bubble */}
            <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {/* Sender name (only for others) */}
                {!isOwn && senderName && (
                    <p className="text-xs text-zinc-500 mb-1 px-1">{senderName}</p>
                )}

                {/* Content based on type */}
                <div className={`rounded-2xl ${isOwn
                    ? 'bg-white text-black rounded-br-sm'
                    : 'bg-zinc-800 text-white rounded-bl-sm'
                    }`}>
                    {messageType === 'product' && (
                        <ChatProductCard content={content} />
                    )}

                    {messageType === 'bag' && (
                        <ChatBagCard content={content} />
                    )}

                    {messageType === 'image' && (
                        <div className="p-1">
                            <img
                                src={content}
                                alt="Shared image"
                                className="max-w-full rounded-xl max-h-80 object-cover"
                                loading="lazy"
                            />
                        </div>
                    )}

                    {messageType === 'video' && (
                        <div className="p-1">
                            <video
                                src={content}
                                controls
                                className="max-w-full rounded-xl max-h-80"
                            />
                        </div>
                    )}

                    {messageType === 'text' && (
                        <p className="px-4 py-2 text-sm whitespace-pre-wrap break-words">
                            {content}
                        </p>
                    )}
                </div>

                {/* Timestamp */}
                <p className={`text-xs text-zinc-600 mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                    {formattedTime}
                    {message.pending && ' ⏳'}
                    {message.error && ' ❌'}
                </p>
            </div>
        </motion.div>
    );
});

/**
 * Detect message type based on content
 */
function detectMessageType(content) {
    if (!content) return 'text';

    // Shopify product
    if (isShopifyProduct(content)) {
        return 'product';
    }

    // Shared shopping bag
    if (isBagLink(content)) {
        return 'bag';
    }

    // Media URLs
    if (isMediaUrl(content)) {
        if (isImageUrl(content)) return 'image';
        if (isVideoUrl(content)) return 'video';
    }

    return 'text';
}

/**
 * Check if content is a media URL
 */
function isMediaUrl(content) {
    const mediaPatterns = [
        /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)/i,
        /^https?:\/\/.*s3.*amazonaws\.com/i,
        /^https?:\/\/.*cloudfront\.net/i,
    ];
    return mediaPatterns.some(pattern => pattern.test(content));
}

function isImageUrl(content) {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(content);
}

function isVideoUrl(content) {
    return /\.(mp4|webm|mov)$/i.test(content);
}

export default ChatMessage;
