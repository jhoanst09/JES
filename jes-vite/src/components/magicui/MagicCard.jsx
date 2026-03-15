'use client';
import React, { useRef, useState } from 'react';
import { cn } from '../../utils/cn';

/**
 * MagicCard (inspired by Magic UI)
 * Dark tech glassmorphism aesthetic with a reactive glowing border and spotlight.
 */
export function MagicCard({
    children,
    className,
    gradientSize = 200,
    gradientColor = 'rgba(0, 209, 255, 0.15)',
    gradientOpacity = 0.8,
}) {
    const cardRef = useRef(null);
    const [mouseX, setMouseX] = useState(-gradientSize);
    const [mouseY, setMouseY] = useState(-gradientSize);

    function handleMouseMove(e) {
        if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            setMouseX(e.clientX - rect.left);
            setMouseY(e.clientY - rect.top);
        }
    }

    function handleMouseLeave() {
        setMouseX(-gradientSize);
        setMouseY(-gradientSize);
    }

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={cn(
                'group relative flex w-full flex-col overflow-hidden rounded-3xl bg-white/[0.02]',
                'border border-white/5 backdrop-blur-xl transition-colors hover:border-white/10 shadow-2xl',
                className
            )}
        >
            {/* Spotlight Gradient effect */}
            <div
                className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                    background: `radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)`,
                    opacity: gradientOpacity,
                }}
            />

            {/* Inner Content Wrapper */}
            <div className="relative z-10 flex h-full flex-col p-6">
                {children}
            </div>
        </div>
    );
}
