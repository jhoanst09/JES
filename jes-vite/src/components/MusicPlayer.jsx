import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTrackPreview, getLyrics } from '../services/music';

export default function MusicPlayer() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const audioRef = useRef(null);
    const [currentTrack, setCurrentTrack] = useState({
        title: "",
        artist: "",
        cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=2070&auto=format&fit=crop",
        duration: "0:00",
        audioSrc: null
    });
    const [playlist, setPlaylist] = useState([]);
    const [showTracklist, setShowTracklist] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uiStage, setUiStage] = useState(0); // 0: Hidden, 1: Mini, 2: Bar, 3: Full Lyrics
    const [lyrics, setLyrics] = useState("");
    const [volume, setVolume] = useState(0.7);
    const [hasStarted, setHasStarted] = useState(false);

    // Event listener for track changes
    useEffect(() => {
        const handlePlayTrack = async (e) => {
            const { autoLoad, ...trackData } = e.detail;
            setIsLoading(true);
            setHasStarted(true);

            // Fetch metadata and tracklist if missing or new album
            if (!trackData.audioSrc || trackData.title !== currentTrack.title) {
                const data = await getTrackPreview(trackData.title, trackData.artist);
                if (data) {
                    trackData.audioSrc = data.previewUrl;
                    trackData.artist = data.artistName;
                    trackData.title = data.trackName;
                    trackData.cover = data.artworkUrl || trackData.cover;
                    setPlaylist(data.tracklist || []);
                }
            }

            setCurrentTrack(prev => ({ ...prev, ...trackData }));
            setIsLoading(false);

            if (!autoLoad) {
                setIsPlaying(true);
                setUiStage(2); // Expand to bar on play
            } else if (uiStage === 0) {
                setUiStage(1); // Show mini if auto-loaded
            }
        };
        window.addEventListener('play-track', handlePlayTrack);
        return () => window.removeEventListener('play-track', handlePlayTrack);
    }, [currentTrack.title, uiStage]);

    // Fetch lyrics when track changes and we are in Full view
    useEffect(() => {
        if (uiStage === 3 && currentTrack.title) {
            setLyrics("...");
            getLyrics(currentTrack.artist, currentTrack.title).then(res => setLyrics(res || null));
        }
    }, [currentTrack.title, uiStage]);

    // Audio Sync Logic
    useEffect(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.play().catch(e => {
                console.warn("Autoplay prevented or audio error:", e);
                setIsPlaying(false);
            });
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, currentTrack.audioSrc]);

    const handleNext = () => {
        if (playlist.length === 0) return;
        const currentIndex = playlist.findIndex(t => t.trackName === currentTrack.title);
        if (currentIndex === -1) {
            selectTrack(playlist[0]);
            return;
        }
        const nextIndex = (currentIndex + 1) % playlist.length;
        selectTrack(playlist[nextIndex]);
    };

    const handlePrev = () => {
        if (playlist.length === 0) return;
        const currentIndex = playlist.findIndex(t => t.trackName === currentTrack.title);
        if (currentIndex === -1) {
            selectTrack(playlist[playlist.length - 1]);
            return;
        }
        const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        selectTrack(playlist[prevIndex]);
    };

    const selectTrack = (track) => {
        setCurrentTrack(prev => ({
            ...prev,
            title: track.trackName,
            artist: track.artistName,
            audioSrc: track.previewUrl,
            cover: track.artworkUrl || prev.cover
        }));
        setIsPlaying(true);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const duration = audioRef.current.duration;
            if (duration) setProgress((current / duration) * 100);
        }
    };

    const formatTime = (time) => {
        if (!time) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!hasStarted) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none">
            <audio
                ref={audioRef}
                src={currentTrack.audioSrc}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleNext}
                onLoadedMetadata={() => audioRef.current.volume = volume}
                preload="auto"
            />

            <AnimatePresence mode="wait">
                {/* STAGE 1: MINI PLAYER */}
                {uiStage === 1 && (
                    <motion.div
                        key="mini"
                        initial={{ scale: 0, opacity: 0, x: -20 }}
                        animate={{ scale: 1, opacity: 1, x: 0 }}
                        exit={{ scale: 0, opacity: 0, x: -20 }}
                        className="absolute bottom-32 left-8 md:bottom-12 pointer-events-auto"
                    >
                        <button
                            onClick={() => setUiStage(2)}
                            className="flex items-center gap-3 p-2 bg-zinc-950/80 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl group hover:scale-105 transition-all"
                        >
                            <div className="w-12 h-12 rounded-lg overflow-hidden relative shadow-lg shrink-0">
                                <img src={currentTrack.cover} className="w-full h-full object-cover" alt="" />
                                {isPlaying && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <div className="flex gap-1 items-end h-4">
                                            <span className="w-0.5 bg-white rounded-full animate-[music-bar_0.5s_infinite_alternate]"></span>
                                            <span className="w-0.5 bg-white rounded-full animate-[music-bar_0.8s_infinite_alternate]"></span>
                                            <span className="w-0.5 bg-white rounded-full animate-[music-bar_0.6s_infinite_alternate]"></span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="pr-4 text-left hidden md:block max-w-[120px]">
                                <p className="text-[10px] font-black text-white uppercase italic leading-tight truncate">{currentTrack.title}</p>
                                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest truncate">{currentTrack.artist}</p>
                            </div>
                        </button>
                    </motion.div>
                )}

                {/* STAGE 2: EXPANDED BAR */}
                {uiStage === 2 && (
                    <motion.div
                        key="bar"
                        initial={{ y: 200, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 200, opacity: 0 }}
                        className="w-full bg-black/95 backdrop-blur-3xl border-t border-white/5 p-4 md:px-12 flex items-center justify-between pointer-events-auto shadow-2xl relative h-28 md:h-32"
                    >
                        <button
                            onClick={() => setUiStage(3)}
                            className="absolute -top-4 left-1/2 -translate-x-1/2 p-2 bg-zinc-900 border border-white/10 rounded-full hover:bg-orange-500 transition-colors z-20 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-y-0.5 transition-transform"><path d="m18 15-6-6-6 6" /></svg>
                        </button>

                        <div className="hidden lg:flex items-center gap-6 w-[300px] shrink-0">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shadow-xl border border-white/10 shrink-0">
                                <img src={currentTrack.cover} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-white font-black text-lg uppercase tracking-tighter truncate italic leading-none">{currentTrack.title}</h4>
                                <p className="text-orange-500 text-[10px] font-black uppercase mt-2">{currentTrack.artist}</p>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center gap-4 min-w-0 px-4">
                            <div className="flex items-center gap-4 md:gap-8">
                                <button onClick={() => setShowTracklist(!showTracklist)} className={showTracklist ? 'text-orange-500' : 'text-zinc-500 shrink-0'}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg></button>
                                <div className="flex items-center gap-4 md:gap-6">
                                    <button onClick={handlePrev} className="text-zinc-500 hover:text-white shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="m11 17-7-5 7-5v10zm8-5-7 5V7l7 5z" /></svg></button>
                                    <button onClick={() => setIsPlaying(!isPlaying)} className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all shrink-0">
                                        {isLoading ? <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" /> : isPlaying ? <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><rect width="4" height="14" x="7" y="5" rx="1.5" /><rect width="4" height="14" x="13" y="5" rx="1.5" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="m7 3 14 9-14 9V3z" /></svg>}
                                    </button>
                                    <button onClick={handleNext} className="text-zinc-500 hover:text-white shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="m13 17 7-5-7-5v10zm-8-5 7 5V7l7 5z" /></svg></button>
                                </div>
                                <div className="hidden md:flex items-center gap-3 w-32 shrink-0">
                                    <span className="text-xs text-white/40">Vol</span>
                                    <div className="flex-1 h-1 bg-white/10 rounded-full relative overflow-hidden cursor-pointer" onClick={(e) => {
                                        const r = e.currentTarget.getBoundingClientRect();
                                        const v = (e.clientX - r.left) / r.width;
                                        setVolume(v);
                                        if (audioRef.current) audioRef.current.volume = v;
                                    }}>
                                        <div className="absolute inset-0 bg-white/40" style={{ width: `${volume * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="w-full max-w-xl flex items-center gap-4 px-4">
                                <span className="text-[10px] text-zinc-600 font-bold tabular-nums w-10 text-right">{formatTime(audioRef.current?.currentTime)}</span>
                                <div className="flex-1 h-1 bg-white/10 rounded-full relative overflow-hidden cursor-pointer group" onClick={(e) => {
                                    if (!audioRef.current) return;
                                    const r = e.currentTarget.getBoundingClientRect();
                                    audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * audioRef.current.duration;
                                }}>
                                    <div className="absolute inset-0 bg-white group-hover:bg-orange-500 transition-colors" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-[10px] text-zinc-600 font-bold tabular-nums w-10">{formatTime(audioRef.current?.duration)}</span>
                            </div>
                        </div>

                        <div className="hidden lg:flex w-[300px] justify-end shrink-0">
                            <button onClick={() => setUiStage(1)} className="p-4 text-zinc-500 hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </button>
                        </div>

                        <AnimatePresence>
                            {showTracklist && (
                                <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="absolute bottom-[120%] right-4 md:right-12 w-80 max-h-[60vh] bg-zinc-950/95 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
                                        <div>
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tracklist</h5>
                                            {playlist.length > 0 && <p className="text-[8px] text-zinc-700 mt-1">{playlist.length} canciones</p>}
                                        </div>
                                        <button onClick={() => setShowTracklist(false)} className="text-zinc-600 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                                    </div>
                                    <div className="overflow-y-auto p-4 space-y-2 no-scrollbar">
                                        {playlist.length > 0 ? playlist.map((t, idx) => (
                                            <button key={idx} onClick={() => selectTrack(t)} className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${currentTrack.title === t.trackName ? 'bg-orange-500/10 border border-orange-500/20' : 'hover:bg-white/5'}`}>
                                                <span className="text-[10px] font-bold text-zinc-600 tabular-nums">{(idx + 1).toString().padStart(2, '0')}</span>
                                                <div className="flex-1 truncate">
                                                    <p className={`text-xs font-black italic truncate ${currentTrack.title === t.trackName ? 'text-orange-500' : 'text-white'}`}>{t.trackName}</p>
                                                    <p className="text-[8px] text-zinc-600 uppercase tracking-widest truncate">{t.artistName}</p>
                                                </div>
                                            </button>
                                        )) : isLoading ? (
                                            <div className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-zinc-600 italic">Buscando tracks...</div>
                                        ) : (
                                            <div className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-zinc-600 italic">No se encontraron tracks</div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* STAGE 3: FULL SCREEN LYRICS VIEW */}
                {uiStage === 3 && (
                    <motion.div
                        key="full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="fixed inset-0 bg-black pointer-events-auto z-[110] overflow-hidden flex flex-col"
                    >
                        {/* Immersive Background */}
                        <motion.div
                            className="absolute inset-0 opacity-30 blur-[120px] scale-150"
                            animate={{ rotate: isPlaying ? 360 : 0 }}
                            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        >
                            <img src={currentTrack.cover} className="w-full h-full object-cover" alt="" />
                        </motion.div>

                        {/* Navigation */}
                        <div className="relative z-30 flex justify-between items-center p-8 md:px-16 w-full">
                            <div className="flex-1 hidden md:block">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-1 block">Ahora Suena</span>
                                <h3 className="text-white text-xl lg:text-3xl font-black italic uppercase tracking-tighter truncate max-w-md font-bricolage">{currentTrack.title}</h3>
                            </div>

                            <button
                                onClick={() => setUiStage(2)}
                                className="group flex flex-col items-center gap-2 hover:scale-110 active:scale-95 transition-all mx-8 shrink-0"
                            >
                                <div className="w-16 h-1 bg-white/20 rounded-full group-hover:bg-orange-500 transition-all" />
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 group-hover:text-white/60 transition-colors">Cerrar</span>
                            </button>

                            <div className="flex-1 text-right hidden md:block">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-1 block">De Jes Store</span>
                                <p className="text-orange-500 text-xl lg:text-3xl font-black tracking-widest uppercase font-bricolage truncate ml-auto max-w-md">{currentTrack.artist}</p>
                            </div>
                        </div>

                        {/* Main Interaction Area */}
                        <div className="relative z-20 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-32 px-10 md:px-20 max-h-[70vh]">
                            {/* Record Section */}
                            <div className="flex flex-col items-center justify-center h-full">
                                <motion.div
                                    className="w-56 h-56 sm:w-72 sm:h-72 md:w-[400px] md:h-[400px] lg:w-[480px] lg:h-[480px] relative shrink-0"
                                    animate={{ rotate: isPlaying ? 360 : 0 }}
                                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                >
                                    {/* Vinyl Body */}
                                    <div className="absolute inset-0 bg-[#0a0a0a] rounded-full shadow-[0_0_100px_rgba(0,0,0,0.8)] flex items-center justify-center border-4 border-white/5">
                                        <div className="w-[98%] h-[98%] rounded-full border border-white/5 opacity-50" />
                                        <div className="w-[85%] h-[85%] rounded-full border border-black border-[20px] md:border-[30px] opacity-90 shadow-inner" />
                                    </div>
                                    {/* Cover in Center */}
                                    <div className="absolute inset-[15%] rounded-full overflow-hidden shadow-2xl border-2 border-white/10 z-10">
                                        <img src={currentTrack.cover} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    {/* The Hole */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full z-20 border border-white/10" />
                                </motion.div>
                            </div>

                            {/* Lyrics Section */}
                            <div className="flex-1 w-full lg:max-w-2xl h-full flex flex-col justify-center">
                                <div className="h-full overflow-y-auto no-scrollbar py-20 mask-gradient-v relative">
                                    {lyrics === "..." ? (
                                        <div className="space-y-8 opacity-20 animate-pulse mt-10">
                                            <div className="h-14 w-full bg-white rounded-2xl" />
                                            <div className="h-14 w-[90%] bg-white rounded-2xl" />
                                            <div className="h-14 w-[95%] bg-white rounded-2xl" />
                                            <div className="h-14 w-[85%] bg-white rounded-2xl" />
                                        </div>
                                    ) : lyrics ? (
                                        <div className="text-white text-3xl md:text-5xl lg:text-7xl font-black leading-[1.1] font-bricolage select-none tracking-tight pb-[50vh] transition-all duration-1000">
                                            {lyrics.split('\n').map((line, i) => (
                                                <motion.p
                                                    key={i}
                                                    initial={{ opacity: 0.1, y: 20 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ amount: 0.5 }}
                                                    className="mb-10 last:mb-0 transition-opacity duration-1000"
                                                >
                                                    {line || <br />}
                                                </motion.p>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col justify-center text-center lg:text-left">
                                            <h2 className="text-6xl md:text-8xl lg:text-[10rem] font-black italic uppercase tracking-tighter text-white/5 leading-none mb-4 font-bricolage">INSTRUMENTAL</h2>
                                            <p className="text-[10px] font-black uppercase tracking-[0.8em] text-white/20 leading-loose">
                                                Esta obra habla por sí sola. Disfruta el sonido de la colección.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Controls Bar */}
                        <div className="relative z-30 p-10 md:p-20 bg-gradient-to-t from-black via-black/80 to-transparent mt-auto">
                            <div className="max-w-[1000px] mx-auto space-y-10">
                                {/* Seek Bar */}
                                <div className="flex items-center gap-8 group">
                                    <span className="text-[11px] font-black tabular-nums text-white/20 w-12 text-right">{formatTime(audioRef.current?.currentTime)}</span>
                                    <div className="flex-1 h-[2px] bg-white/10 rounded-full relative cursor-pointer" onClick={(e) => {
                                        if (!audioRef.current) return;
                                        const r = e.currentTarget.getBoundingClientRect();
                                        audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * audioRef.current.duration;
                                    }}>
                                        <div className="absolute inset-0 bg-white group-hover:bg-orange-500 transition-colors" style={{ width: `${progress}%` }} />
                                    </div>
                                    <span className="text-[11px] font-black tabular-nums text-white/20 w-12">{formatTime(audioRef.current?.duration)}</span>
                                </div>

                                {/* Main Buttons */}
                                <div className="flex items-center justify-center gap-12 md:gap-24">
                                    <button onClick={handlePrev} className="text-white/20 hover:text-white hover:scale-125 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="m11 17-7-5 7-5v10zm8-5-7 5V7l7 5z" /></svg></button>
                                    <button onClick={() => setIsPlaying(!isPlaying)} className="w-24 h-24 md:w-32 md:h-32 bg-white text-black rounded-full flex items-center justify-center hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all">
                                        {isPlaying ? <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><rect width="6" height="20" x="5" y="2" rx="2" /><rect width="6" height="20" x="13" y="2" rx="2" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="ml-2"><path d="m7 3 14 9-14 9V3z" /></svg>}
                                    </button>
                                    <button onClick={handleNext} className="text-white/20 hover:text-white hover:scale-125 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="m13 17 7-5-7-5v10zm-8-5 7 5V7l7 5z" /></svg></button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
