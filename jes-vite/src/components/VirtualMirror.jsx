import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VirtualMirror({ isOpen, onClose, productImage, productName }) {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen]);

    const startCamera = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    setIsLoading(false);
                };
            }
        } catch (err) {
            console.error("Camera access denied:", err);
            setError("No pudimos acceder a tu cámara. Por favor, revisa los permisos de tu navegador.");
            setIsLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] bg-black flex items-center justify-center overflow-hidden"
            >
                {/* Camera Feed */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-60"
                />

                {/* Mirror Overlay / Frame */}
                {/* We apply a mask to the product image to "cut out" the center, creating a 'lens' effect */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring", damping: 25 }}
                    className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 md:p-32"
                >
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img
                            src={productImage}
                            style={{
                                maskImage: 'radial-gradient(circle, transparent 35%, black 75%)',
                                WebkitMaskImage: 'radial-gradient(circle, transparent 35%, black 75%)',
                            }}
                            className="max-w-full max-h-full object-contain filter contrast-125 brightness-110 drop-shadow-[0_0_50px_rgba(255,255,255,0.2)]"
                            alt="Mirror Lens"
                        />

                        {/* Glass Reflections Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-white/20 via-transparent to-white/10 pointer-events-none mix-blend-screen opacity-30"></div>
                        </div>

                        {/* Lens Flare / Digital Detail */}
                        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                    </div>
                </motion.div>

                {/* UI Overlay */}
                <div className="absolute inset-0 flex flex-col pointer-events-none">
                    {/* Header */}
                    <div className="p-8 flex justify-between items-start">
                        <div className="pointer-events-auto">
                            <h2 className="text-white text-3xl font-black uppercase tracking-tighter leading-none">{productName}</h2>
                            <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Virtual Preview Mode</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="pointer-events-auto w-14 h-14 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full flex items-center justify-center hover:bg-red-500 hover:border-red-500 transition-all active:scale-90 group shadow-2xl"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>

                    {/* Footer Tips */}
                    <div className="mt-auto p-12 flex justify-center">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-full pointer-events-auto">
                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest text-center">
                                {isLoading ? "Iniciando cámara..." : "Muévete para ver cómo refleja la luz en tu espacio"}
                            </p>
                        </div>
                    </div>
                </div>

                {isLoading && (
                    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-white/40 text-xs font-black uppercase tracking-widest">Cargando AR...</p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-8 text-center gap-6">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /><line x1="12" y1="13" x2="12" y2="13.01" /></svg>
                        </div>
                        <h3 className="text-white text-xl font-bold">{error}</h3>
                        <button
                            onClick={onClose}
                            className="px-8 py-4 bg-white text-black font-black rounded-full uppercase text-xs tracking-widest"
                        >
                            Entendido
                        </button>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
