'use client';
import dynamic from 'next/dynamic';

/**
 * BIZ Page — Code-split with next/dynamic
 * Same pattern as WAVE: loads BizClient only when navigating to /biz
 */
const BizClient = dynamic(() => import('../../src/components/biz/BizClient'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen pt-28 pb-32 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-[3px] border-white/10 border-t-[#FFD700] rounded-full animate-spin shadow-[0_0_20px_rgba(255,215,0,0.6)]" />
                <p className="font-mono text-[10px] text-zinc-500 tracking-widest uppercase">
                    CARGANDO BIZ SCHEDULER...
                </p>
            </div>
        </div>
    )
});

export default function BizPage() {
    return <BizClient />;
}
