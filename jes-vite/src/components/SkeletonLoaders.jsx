'use client';

import { motion } from 'framer-motion';

/**
 * Skeleton Loader Components
 * Displays while data is loading to prevent layout shift
 */

// Pulse animation for skeleton elements
const pulseAnimation = {
    initial: { opacity: 0.4 },
    animate: {
        opacity: [0.4, 0.7, 0.4],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
        }
    }
};

/**
 * Friend/Contact Card Skeleton
 */
export function FriendSkeleton({ count = 5 }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    {...pulseAnimation}
                    className="flex items-center gap-3 p-3 rounded-xl"
                >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-zinc-800" />

                    <div className="flex-1 space-y-2">
                        {/* Name */}
                        <div className="h-4 w-28 rounded bg-zinc-800" />
                        {/* Status */}
                        <div className="h-3 w-20 rounded bg-zinc-800/60" />
                    </div>

                    {/* Online indicator placeholder */}
                    <div className="w-3 h-3 rounded-full bg-zinc-800" />
                </motion.div>
            ))}
        </div>
    );
}

/**
 * Message Bubble Skeleton
 */
export function MessageSkeleton({ count = 6 }) {
    return (
        <div className="space-y-4 p-4">
            {Array.from({ length: count }).map((_, i) => {
                const isLeft = i % 3 !== 0; // Alternate positions
                return (
                    <motion.div
                        key={i}
                        {...pulseAnimation}
                        className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}
                    >
                        <div className={`rounded-2xl p-4 ${isLeft ? 'bg-zinc-800' : 'bg-zinc-700'}`}
                            style={{ width: `${40 + Math.random() * 40}%` }}
                        >
                            <div className="h-4 rounded bg-zinc-600 mb-2" style={{ width: '100%' }} />
                            <div className="h-3 w-16 rounded bg-zinc-600/60" />
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

/**
 * Chat List Skeleton
 */
export function ChatListSkeleton({ count = 4 }) {
    return (
        <div className="space-y-1">
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    {...pulseAnimation}
                    className="flex items-center gap-3 p-4 border-l-4 border-transparent"
                >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-zinc-800" />

                    <div className="flex-1 space-y-2">
                        {/* Name */}
                        <div className="h-4 w-32 rounded bg-zinc-800" />
                        {/* Last message preview */}
                        <div className="h-3 w-40 rounded bg-zinc-800/60" />
                    </div>

                    <div className="space-y-2 text-right">
                        {/* Time */}
                        <div className="h-3 w-10 rounded bg-zinc-800" />
                        {/* Unread badge */}
                        <div className="h-5 w-5 rounded-full bg-zinc-800 ml-auto" />
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

/**
 * Product Card Skeleton
 */
export function ProductSkeleton({ count = 4 }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    {...pulseAnimation}
                    className="rounded-2xl overflow-hidden"
                >
                    {/* Image */}
                    <div className="aspect-square bg-zinc-800" />

                    <div className="p-4 space-y-2">
                        {/* Title */}
                        <div className="h-4 w-full rounded bg-zinc-800" />
                        {/* Price */}
                        <div className="h-5 w-20 rounded bg-zinc-800" />
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

/**
 * Profile Card Skeleton
 */
export function ProfileSkeleton() {
    return (
        <motion.div {...pulseAnimation} className="p-6 space-y-4">
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-zinc-800" />

                <div className="space-y-2">
                    <div className="h-6 w-40 rounded bg-zinc-800" />
                    <div className="h-4 w-24 rounded bg-zinc-800/60" />
                </div>
            </div>

            <div className="h-20 rounded-xl bg-zinc-800" />

            <div className="flex gap-4">
                <div className="h-10 flex-1 rounded-xl bg-zinc-800" />
                <div className="h-10 flex-1 rounded-xl bg-zinc-800" />
            </div>
        </motion.div>
    );
}

/**
 * Generic Inline Skeleton
 */
export function InlineSkeleton({ width = 100, height = 16 }) {
    return (
        <motion.span
            {...pulseAnimation}
            className="inline-block rounded bg-zinc-800"
            style={{ width, height }}
        />
    );
}

export default {
    FriendSkeleton,
    MessageSkeleton,
    ChatListSkeleton,
    ProductSkeleton,
    ProfileSkeleton,
    InlineSkeleton
};
