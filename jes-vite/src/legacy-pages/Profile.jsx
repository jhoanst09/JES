import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { supabase } from '../services/supabase';
import { getCollectionProducts } from '../services/shopify';
import ProductCard from '../components/ProductCard';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileTabBar from '../components/MobileTabBar';

export default function Profile() {
    const navigate = useNavigate();
    const { wishlist, userProfile, isLoggedIn, loading, socialLoading, login, signUp, loginWithGoogle, resetPassword, logout, togglePrivacy, updateProfile, toggleFollow, following, followRequests, sentFollowRequests, acceptFollowRequest, rejectFollowRequest, orders } = useWishlist();
    const [activeTab, setActiveTab] = useState('wishlist');
    const [wishlistFilter, setWishlistFilter] = useState('public');
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(userProfile.name);
    const [tempBio, setTempBio] = useState(userProfile.bio || '');
    const [tempNationality, setTempNationality] = useState(userProfile.nationality || '');
    const [tempCity, setTempCity] = useState(userProfile.city || '');
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [otherUsers, setOtherUsers] = useState([]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState(null);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    useEffect(() => {
        setTempName(userProfile.name);
        setTempBio(userProfile.bio || '');
        setTempNationality(userProfile.nationality || '');
        setTempCity(userProfile.city || '');
    }, [userProfile]);

    useEffect(() => {
        // Fetch real users from DB for discovery
        async function fetchUsers() {
            let query = supabase.from('profiles').select('*').limit(20);

            // Excluirme a mí mismo de la lista de descubrimiento
            if (userProfile?.id) {
                query = query.neq('id', userProfile.id);
            }

            const { data } = await query;
            if (data) setOtherUsers(data);
        }
        fetchUsers();
    }, [userProfile?.id]);

    const handleSaveProfile = async () => {
        await updateProfile({
            name: tempName,
            bio: tempBio,
            nationality: tempNationality,
            city: tempCity
        });
        setIsEditing(false);
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${userProfile.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload to Supabase Storage (requires 'avatars' bucket)
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update Profile
            await updateProfile({ avatar_url: publicUrl });
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Vaya, no pudimos subir la foto. ¿Ya configuraste el bucket "avatars" en Supabase?');
        } finally {
            setUploading(false);
        }
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim().length > 0) {
            let sQuery = supabase
                .from('profiles')
                .select('*')
                .ilike('name', `%${query}%`);

            if (userProfile?.id) {
                sQuery = sQuery.neq('id', userProfile.id);
            }

            const { data } = await sQuery.limit(20);
            if (data) setSearchResults(data);
        } else {
            setSearchResults([]);
        }
    };

    const handleAuth = async () => {
        try {
            setAuthError(null);

            if (!email || (!forgotPasswordMode && !password)) {
                setAuthError('Por favor completa los campos requeridos.');
                return;
            }

            if (forgotPasswordMode) {
                await resetPassword(email);
                setResetSent(true);
                setAuthError('¡Chevere! Revisa tu correo para restablecer tu contraseña.');
            } else if (isLoginMode) {
                await login({ email, password });
            } else {
                const res = await signUp({ email, password });
                if (res?.needsConfirmation) {
                    setAuthError('¡Chevere! Cuenta creada. Revisa tu correo para confirmar.');
                } else {
                    setAuthError('¡Chevere! Cuenta creada. Ahora inicia sesión.');
                    setIsLoginMode(true);
                    setPassword('');
                }
            }
        } catch (err) {
            setAuthError(err.message || 'Error en el proceso. Revisa tus datos, vale.');
            console.error(err);
        }
    };

    const handleGoogleAuth = async () => {
        try {
            await loginWithGoogle();
        } catch (err) {
            setAuthError('Hubo un error con el inicio de sesión de Google.');
            console.error(err);
        }
    };

    const filteredWishlist = wishlist.filter(item =>
        wishlistFilter === 'public' ? !item.isPrivate : item.isPrivate
    );

    // Simplified loading: only show for initial mount
    const [initialLoad, setInitialLoad] = useState(true);
    useEffect(() => {
        if (!loading) setInitialLoad(false);
    }, [loading]);


    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white selection:bg-blue-500/30 transition-colors duration-300">
                <Header />
                <main className="max-w-md mx-auto px-6 pt-48 pb-24 text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-[40px] flex items-center justify-center text-5xl mx-auto mb-10 shadow-2xl border border-white/10"
                    >
                        🔑
                    </motion.div>

                    <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 leading-none text-black">
                        {forgotPasswordMode ? 'Recupera tu Acceso' : (isLoginMode ? 'Inicia Sesión' : 'Crea tu Cuenta')}
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-500 mb-12 font-medium">
                        {forgotPasswordMode ? 'Te enviaremos un link para cambiar tu contraseña.' : (isLoginMode ? 'Inicia sesión con tu correo y contraseña.' : 'Únete a la mejor comunidad de compras colectivas.')}
                    </p>

                    <AnimatePresence mode="wait">
                        <motion.div key="form" className="space-y-4">
                            <div className="space-y-2 text-left">
                                <div className="relative group">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="Correo electrónico"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 outline-none focus:border-blue-500 transition-all font-medium text-lg placeholder:text-zinc-400 dark:placeholder:text-zinc-700 text-black dark:text-white"
                                        autoComplete="email"
                                    />
                                </div>
                                {!forgotPasswordMode && (
                                    <div className="relative group mt-2">
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder={isLoginMode ? "Tu contraseña" : "Crea una contraseña segura"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 pr-16 outline-none focus:border-blue-500 transition-all font-medium text-lg placeholder:text-zinc-400 dark:placeholder:text-zinc-700 text-black dark:text-white"
                                            autoComplete={isLoginMode ? "current-password" : "new-password"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-blue-500 transition-colors"
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88 1.45 1.45" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /><path d="M14.21 14.21a3 3 0 0 1-4.24-4.24" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" /><circle cx="12" cy="12" r="3" /></svg>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {authError && <p className={`text-xs font-bold px-4 ${authError.includes('Chevere') ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>{authError}</p>}

                            <button
                                onClick={handleAuth}
                                className="w-full py-6 bg-black dark:bg-white text-white dark:text-black font-black rounded-3xl uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl mt-4"
                            >
                                {forgotPasswordMode ? 'Enviar Link de Recuperación' : (isLoginMode ? 'Iniciar Sesión' : 'Crear mi Cuenta')}
                            </button>

                            {isLoginMode && !forgotPasswordMode && (
                                <button
                                    onClick={() => setForgotPasswordMode(true)}
                                    className="text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-blue-500 transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            )}

                            {forgotPasswordMode && (
                                <button
                                    onClick={() => {
                                        setForgotPasswordMode(false);
                                        setAuthError(null);
                                    }}
                                    className="text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-blue-500 transition-colors"
                                >
                                    Volver al Inicio de Sesión
                                </button>
                            )}

                            {!forgotPasswordMode && isLoginMode && (
                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center gap-4 text-zinc-400">
                                        <div className="h-px bg-current flex-1 opacity-20" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">O continúa con</span>
                                        <div className="h-px bg-current flex-1 opacity-20" />
                                    </div>
                                    <button
                                        onClick={handleGoogleAuth}
                                        className="w-full py-5 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-3xl flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-md group"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
                                        </svg>
                                        <span className="text-sm font-bold text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Google</span>
                                    </button>
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-black/10 dark:border-white/10">
                                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-3">
                                    {isLoginMode ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                                </p>
                                <button
                                    onClick={() => {
                                        setIsLoginMode(!isLoginMode);
                                        setAuthError(null);
                                    }}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-3xl uppercase tracking-widest text-sm transition-all shadow-lg"
                                >
                                    {isLoginMode ? 'Crear Cuenta Nueva' : 'Iniciar Sesión'}
                                </button>
                            </div>

                            <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest mt-12">Acceso seguro con Supabase Auth</p>
                        </motion.div>
                    </AnimatePresence>
                </main>
                <Footer />
                <MobileTabBar />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white selection:bg-blue-500/30 transition-colors duration-300">
            <Header />

            <main className="max-w-[1200px] mx-auto px-6 pt-32 pb-24">
                {/* Profile Header */}
                <section className="mb-20">
                    <div className="flex flex-col md:flex-row items-center gap-10 bg-zinc-100 dark:bg-zinc-900/30 p-12 rounded-[56px] border border-black/5 dark:border-white/5 backdrop-blur-md relative overflow-hidden group transition-colors duration-300">
                        <div className="relative group/avatar">
                            <div className="w-32 h-32 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 rounded-full flex items-center justify-center text-6xl relative z-10 border border-black/10 dark:border-white/10 shadow-3xl overflow-hidden transition-colors duration-300">
                                {userProfile.avatar_url ? (
                                    <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="select-none">
                                        {['🌴', '🥥', '🌊', '🍍', '🐙', '🦜'][userProfile.name?.length % 6] || '🌴'}
                                    </span>
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>

                            <label className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer rounded-full backdrop-blur-sm">
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                            </label>
                        </div>

                        <div className="flex-1 text-center md:text-left relative z-10 space-y-4">
                            {isEditing ? (
                                <div className="flex flex-col md:flex-row items-center gap-4">
                                    <div className="flex flex-col gap-4 w-full">
                                        <input
                                            type="text"
                                            value={tempName}
                                            onChange={(e) => setTempName(e.target.value)}
                                            placeholder="Tu nombre elegante"
                                            className="bg-zinc-200 dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-2xl px-6 py-4 text-2xl font-black text-black dark:text-white focus:border-blue-500 outline-none w-full shadow-inner transition-colors duration-300"
                                            autoFocus
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input
                                                type="text"
                                                value={tempNationality}
                                                onChange={(e) => setTempNationality(e.target.value)}
                                                placeholder="Nacionalidad (ej: 🇨🇴 Colombia)"
                                                className="bg-zinc-200 dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-black dark:text-white focus:border-blue-500 outline-none w-full shadow-inner transition-colors duration-300"
                                            />
                                            <input
                                                type="text"
                                                value={tempCity}
                                                onChange={(e) => setTempCity(e.target.value)}
                                                placeholder="Ciudad (ej: Barranquilla)"
                                                className="bg-zinc-200 dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-black dark:text-white focus:border-blue-500 outline-none w-full shadow-inner transition-colors duration-300"
                                            />
                                        </div>
                                        <textarea
                                            value={tempBio}
                                            onChange={(e) => setTempBio(e.target.value)}
                                            placeholder="Escribe algo sobre ti..."
                                            className="bg-zinc-200 dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-black dark:text-white focus:border-blue-500 outline-none w-full shadow-inner h-24 resize-none transition-colors duration-300"
                                        />
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <button
                                            onClick={handleSaveProfile}
                                            className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex-1 md:flex-none"
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-8 py-4 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white font-bold rounded-2xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all flex-1 md:flex-none"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row items-center gap-6 justify-between w-full">
                                    <div className="flex items-center gap-4">
                                        <div className="space-y-1">
                                            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none text-black dark:text-white transition-colors duration-300">{userProfile.name}</h1>
                                            <div className="flex items-center gap-3 text-zinc-500 text-xs font-bold uppercase tracking-widest pt-2">
                                                {userProfile.nationality && (
                                                    <span className="flex items-center gap-1.5">
                                                        <span>{userProfile.nationality}</span>
                                                    </span>
                                                )}
                                                {userProfile.nationality && userProfile.city && <span className="w-1 h-1 bg-zinc-800 rounded-full"></span>}
                                                {userProfile.city && (
                                                    <span>{userProfile.city}</span>
                                                )}
                                            </div>
                                            <p className="text-zinc-600 dark:text-zinc-400 font-medium max-w-md pt-4 leading-relaxed transition-colors duration-300">{userProfile.bio || 'Sin biografía aún.'}</p>
                                        </div>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="p-3 bg-black/5 dark:bg-white/5 rounded-2xl text-zinc-500 hover:text-blue-500 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                        </button>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                                    >
                                        Cerrar Sesión
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center justify-center md:justify-start gap-4">
                                <p className="text-zinc-500 font-bold text-sm tracking-wide">{userProfile.email}</p>
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Verificado</span>
                                <span className="w-1.5 h-1.5 bg-zinc-800 rounded-full"></span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Siguiendo {following.length}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main Tabs */}
                <div className="flex gap-4 md:gap-12 border-b border-white/5 pb-8 overflow-x-auto no-scrollbar scroll-smooth px-2">
                    {['wishlist', 'orders', 'social', 'plaza'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`text-[10px] md:text-xs font-black uppercase tracking-[0.2em] relative py-3 px-6 rounded-2xl transition-all whitespace-nowrap z-10 ${activeTab === tab ? 'text-white dark:text-black' : 'text-zinc-500 hover:text-black dark:hover:text-zinc-300 bg-zinc-100 dark:bg-white/5'}`}
                        >
                            {tab === 'wishlist' ? 'Mis Deseos' : tab === 'orders' ? 'Mis Compras' : tab === 'social' ? 'Amigos' : 'Comunidad'}
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-black dark:bg-white rounded-2xl -z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </button>
                    ))}
                </div>
                <AnimatePresence mode="wait">
                    {activeTab === 'orders' && (
                        <motion.div
                            key="orders"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="space-y-8"
                        >
                            <h2 className="text-4xl font-black uppercase tracking-tighter italic">Tu <span className="text-green-500">Historial</span> 🛍️</h2>
                            <div className="grid grid-cols-1 gap-4">
                                {orders.length > 0 ? (
                                    orders.map((order, idx) => (
                                        <motion.div
                                            key={order.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 p-6 rounded-[32px] flex items-center justify-between hover:bg-black dark:hover:bg-white/5 group transition-all duration-300"
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 bg-zinc-200 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-green-500/20 group-hover:text-green-500 transition-colors">
                                                    📦
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="font-black text-xl text-zinc-900 dark:text-white group-hover:text-white transition-colors leading-none tracking-tight">{order.product_title}</h3>
                                                    <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
                                                        {new Date(order.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="text-zinc-900 dark:text-white group-hover:text-white transition-colors font-black text-lg">{order.price}</p>
                                                <span className="inline-block px-3 py-1 bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest rounded-full border border-green-500/20">
                                                    {order.status}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center bg-zinc-900/30 rounded-[40px] border border-dashed border-white/5">
                                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Aún no has realizado ninguna compra.</p>
                                        <Link to="/" className="mt-4 inline-block text-blue-500 font-black uppercase text-[10px] hover:underline">Ir a la Tienda</Link>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'social' && (
                        <motion.div
                            key="social"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="space-y-8"
                        >
                            <div className="space-y-12">
                                {followRequests.length > 0 && (
                                    <section className="space-y-6">
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-500 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                                            Solicitudes Pendientes ({followRequests.length})
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {followRequests.map(req => (
                                                <div key={req.id} className="bg-blue-600/10 dark:bg-blue-500/5 border border-blue-500/30 dark:border-blue-500/20 p-6 rounded-[32px] flex items-center gap-6 shadow-xl">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden shrink-0">
                                                        <img src={req.profiles.avatar_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm truncate">@{req.profiles.name}</p>
                                                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Quiere ser tu amigo</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => acceptFollowRequest(req.id, req.sender_id)}
                                                            className="p-2 bg-blue-600 text-white rounded-xl hover:scale-110 active:scale-95 transition-all text-[10px] font-black uppercase px-4"
                                                        >
                                                            Aceptar
                                                        </button>
                                                        <button
                                                            onClick={() => rejectFollowRequest(req.id)}
                                                            className="p-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl hover:text-red-500 transition-all"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <div className="space-y-6">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter italic">Tus <span className="text-blue-500">Amigos</span> 🔥</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {otherUsers.filter(u => following.includes(u.id)).length > 0 ? (
                                            otherUsers.filter(u => following.includes(u.id)).map((user, idx) => (
                                                <motion.div
                                                    key={user.id}
                                                    layout
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    onClick={() => navigate(`/wishlist?user=${user.id}`)}
                                                    className="group bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 p-6 rounded-[32px] flex items-center gap-6 hover:bg-black dark:hover:bg-white hover:border-black dark:hover:border-white transition-all cursor-pointer shadow-xl duration-500"
                                                >
                                                    <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0 border border-black/10 dark:border-white/10 group-hover:border-white transition-all duration-300">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 space-y-1 overflow-hidden">
                                                        <h3 className="font-black text-2xl text-zinc-900 dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors leading-none tracking-tighter truncate">{user.name}</h3>
                                                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest group-hover:text-white/50 dark:group-hover:text-zinc-600 transition-colors">Residente Jes Store</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleFollow(user.id);
                                                        }}
                                                        className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center shrink-0"
                                                        title="Dejar de seguir"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                                    </button>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-20 text-center bg-zinc-900/30 rounded-[40px] border border-dashed border-white/5">
                                                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Aún no sigues a ningún amigo...</p>
                                                <button onClick={() => setActiveTab('plaza')} className="mt-4 text-blue-500 font-black uppercase text-[10px] hover:underline">Ir a la Comunidad</button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="pt-8">
                                        <Link
                                            to="/chat"
                                            className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
                                        >
                                            <span>💬</span> Abrir Mensajería
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'wishlist' && (
                        <motion.div
                            key="wishlist"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="space-y-12"
                        >
                            <div className="flex gap-8 border-b border-black/5 dark:border-white/5 pb-8 overflow-x-auto no-scrollbar">
                                <button
                                    onClick={() => setWishlistFilter('public')}
                                    className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 whitespace-nowrap transition-all px-4 py-2 rounded-xl ${wishlistFilter === 'public' ? 'text-blue-600 bg-blue-500/10 scale-105' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                                >
                                    🌍 Públicos ({wishlist.filter(i => !i.isPrivate).length})
                                    {wishlistFilter === 'public' && <motion.div layoutId="subtab-underline" className="h-0.5 w-full bg-blue-500 absolute -bottom-8 rounded-full" />}
                                </button>
                                <button
                                    onClick={() => setWishlistFilter('private')}
                                    className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 whitespace-nowrap transition-all px-4 py-2 rounded-xl ${wishlistFilter === 'private' ? 'text-amber-600 bg-amber-500/10 scale-105' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
                                >
                                    🔒 Privados ({wishlist.filter(i => i.isPrivate).length})
                                    {wishlistFilter === 'private' && <motion.div layoutId="subtab-underline" className="h-0.5 w-full bg-amber-500 absolute -bottom-8 rounded-full" />}
                                </button>
                            </div>

                            {filteredWishlist.length > 0 ? (
                                <>
                                    {wishlistFilter === 'public' && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex flex-col md:flex-row justify-between items-center bg-blue-600/5 border border-blue-500/20 p-6 md:p-8 rounded-[32px] md:rounded-[40px] mb-12 gap-6 group hover:bg-blue-600/10 transition-all"
                                        >
                                            <div className="space-y-1 text-center md:text-left">
                                                <h3 className="font-black uppercase tracking-tighter text-lg md:text-xl italic text-black dark:text-white">Tu Link de Compartir</h3>
                                                <p className="text-zinc-500 text-[10px] md:text-sm font-medium uppercase tracking-widest leading-relaxed">¡Comparte tu lista con tus amigos para que vean lo que te gusta!</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const publicHandles = wishlist.filter(i => !i.isPrivate).map(p => p.handle).join(',');
                                                    const url = `${window.location.origin}/wishlist?items=${publicHandles}`;
                                                    navigator.clipboard.writeText(url);
                                                    alert('¡Link copiado! (Solo incluye los públicos).');
                                                }}
                                                className="w-full md:w-auto px-10 py-5 bg-white text-black font-black flex items-center justify-center gap-3 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                                Copiar Catálogo
                                            </button>
                                        </motion.div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                                        {filteredWishlist.map((product) => (
                                            <motion.div
                                                layout
                                                key={product.id}
                                                className="bg-transparent rounded-[48px] overflow-hidden group hover:border-blue-500/30 transition-all duration-500"
                                            >
                                                <Link to={`/product/${product.handle}`} className="block aspect-square relative overflow-hidden rounded-[40px] bg-zinc-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-xl">
                                                    <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                                                    <div className="absolute top-6 right-6 flex flex-col gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                togglePrivacy(product.id || product.db_id);
                                                            }}
                                                            className="p-3 bg-black/60 backdrop-blur-xl rounded-2xl text-white border border-white/10 hover:scale-110 active:scale-90 transition-all shadow-2xl"
                                                            title={product.isPrivate ? "Hacer público" : "Hacer privado"}
                                                        >
                                                            {product.isPrivate ?
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                                                                :
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                                            }
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                toggleWishlist(product);
                                                            }}
                                                            className="p-3 bg-red-500/80 backdrop-blur-xl rounded-2xl text-white border border-white/10 hover:scale-110 active:scale-90 transition-all shadow-2xl"
                                                            title="Eliminar de mi lista"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                                        </button>
                                                    </div>
                                                </Link>
                                                <div className="p-8 space-y-4">
                                                    <div>
                                                        <p className="text-blue-600 dark:text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] mb-1">{product.type}</p>
                                                        <h3 className="font-black text-xl mb-1 tracking-tight leading-tight text-zinc-900 dark:text-white transition-colors duration-300 italic">{product.title}</h3>
                                                        <p className="text-zinc-500 dark:text-zinc-400 font-bold text-base transition-colors duration-300">{product.price}</p>
                                                    </div>
                                                    <Link to={`/product/${product.handle}`} className="block w-full py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl text-center font-black text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all shadow-md">
                                                        Regalar 🎁
                                                    </Link>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-16">
                                    <div className="text-center py-32 bg-zinc-50 dark:bg-zinc-900/30 rounded-[64px] border border-dashed border-black/5 dark:border-white/10">
                                        <span className="text-8xl block mb-8 opacity-30 select-none">🥥</span>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-4 text-zinc-900 dark:text-white">Tu lista está vacía.</h2>
                                        <p className="text-zinc-500 mb-12 max-w-xs mx-auto text-lg font-medium italic">Empieza a guardar lo que te gusta y crea tu propio estilo.</p>
                                        <Link to="/" className="inline-block px-12 py-5 bg-black dark:bg-white text-white dark:text-black font-black rounded-full uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl">Explorar Tienda</Link>
                                    </div>

                                    {/* Recommendations Section */}
                                    <div className="space-y-8 pt-10">
                                        <div className="flex items-center gap-4">
                                            <div className="h-px bg-black/5 dark:bg-white/5 flex-1" />
                                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">Te podría gustar</h3>
                                            <div className="h-px bg-black/5 dark:bg-white/5 flex-1" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 opacity-70">
                                            {[
                                                { handle: 'espejo-blonde', nombre: 'Espejo Blonde', precio: '$99.999', emoji: '🪞' },
                                                { handle: 'funko-pop-luffy', nombre: 'Funko Luffy', precio: '$85.000', emoji: '🏴‍☠️' },
                                                { handle: 'vinyl-igor', nombre: 'Vinyl IGOR', precio: '$150.000', emoji: '💿' }
                                            ].map((prod) => (
                                                <ProductCard key={prod.handle} {...prod} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'plaza' && (
                        <motion.div
                            key="plaza"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="space-y-16"
                        >
                            {/* User Discovery Search */}
                            <div className="relative max-w-3xl mx-auto group">
                                <div className="absolute inset-0 bg-blue-600/10 blur-[40px] rounded-full scale-0 group-focus-within:scale-100 transition-transform duration-500"></div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute left-8 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                <input
                                    type="text"
                                    placeholder="Nombre o correo..."
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-black/5 dark:border-white/5 rounded-[32px] md:rounded-[40px] py-6 md:py-8 pl-18 md:pl-22 pr-8 md:pr-10 text-lg md:text-2xl focus:border-blue-500 outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-800 text-zinc-900 dark:text-white font-black tracking-tight shadow-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
                                {(searchResults.length > 0 ? searchResults : otherUsers).map(user => (
                                    <motion.div
                                        key={user.id}
                                        layout
                                        whileHover={{ y: -4 }}
                                        className="bg-zinc-100 dark:bg-zinc-900/30 border border-black/10 dark:border-white/10 p-6 md:p-8 rounded-[40px] flex items-center gap-4 md:gap-6 hover:bg-white dark:hover:bg-zinc-900 group transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden"
                                        onClick={() => navigate(`/wishlist?user=${user.id}`)}
                                    >
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-white dark:bg-zinc-800 rounded-2xl md:rounded-[24px] flex items-center justify-center text-3xl md:text-4xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden shrink-0">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                '👤'
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <h3 className="font-black text-xl md:text-2xl text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-none tracking-tighter truncate">{user.name}</h3>
                                            <p className="text-zinc-500 dark:text-zinc-500 text-[10px] md:text-xs line-clamp-1 italic font-medium uppercase tracking-widest">{user.city || 'Caribe'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFollow(user.id);
                                                }}
                                                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shrink-0 ${following.includes(user.id) ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'}`}
                                            >
                                                {socialLoading[user.id] ? (
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    following.includes(user.id) ? '✓' : sentFollowRequests.includes(user.id) ? '⌛' : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="16" x2="22" y1="11" y2="11" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <Footer />
            <MobileTabBar />
        </div>
    );
}
