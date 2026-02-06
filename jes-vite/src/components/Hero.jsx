import { useState } from 'react';

export default function Hero() {
    return (
        <section className="relative min-h-[80vh] flex flex-col items-center justify-center pt-20 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

            <div className="max-w-4xl mx-auto px-6 text-center">
                <div>
                    <h1 className="text-6xl md:text-8xl font-black leading-tight font-bricolage tracking-tighter transition-none hero-title">
                        too good to compare
                    </h1>
                </div>

                <p className="mt-8 text-lg md:text-xl font-medium tracking-wide max-w-2xl mx-auto hero-subtitle">
                    La intersección definitiva entre la tecnología de vanguardia y la narrativa del Caribe.
                </p>

                {/* Footnote removed */}

                {/* 3D Render Placeholder / Visual Item - Removed UFO as requested */}
            </div>
        </section>
    );
}
