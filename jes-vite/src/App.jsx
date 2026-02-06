import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Electronics from './pages/Electronics';
import Apparel from './pages/Apparel';
import Music from './pages/Music';
import Sports from './pages/Sports';
import Gaming from './pages/Gaming';
import Gadgets from './pages/Gadgets';
import HomeDecor from './pages/HomeDecor';
import Books from './pages/Books';
import Accessories from './pages/Accessories';
import Perfumes from './pages/Perfumes';
import ProductDetails from './pages/ProductDetails';
import Wishlist from './pages/Wishlist';
import Profile from './pages/Profile';
import Cart from './pages/Cart';
import AiPage from './pages/AiPage';
import Streaming from './pages/Streaming';
import About from './pages/About';
import Community from './pages/Community';
import Explore from './pages/Explore';
import Chat from './pages/Chat';
import AIAssistant from './components/AIAssistant';
import SearchModal from './components/SearchModal';
import MusicPlayer from './components/MusicPlayer';
import { WishlistProvider } from './context/WishlistContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { TerminalProvider } from './context/TerminalContext';
import PurchaseTerminal from './components/PurchaseTerminal';
import { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleOpenSearch = () => setSearchOpen(true);
    window.addEventListener('open-search', handleOpenSearch);
    return () => window.removeEventListener('open-search', handleOpenSearch);
  }, []);

  return (
    <ThemeProvider>
      <WishlistProvider>
        <CartProvider>
          <TerminalProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/electronics" element={<Electronics />} />
              <Route path="/apparel" element={<Apparel />} />
              <Route path="/music" element={<Music />} />
              <Route path="/sports" element={<Sports />} />
              <Route path="/gaming" element={<Gaming />} />
              <Route path="/gadgets" element={<Gadgets />} />
              <Route path="/home-decor" element={<HomeDecor />} />
              <Route path="/books" element={<Books />} />
              <Route path="/accessories" element={<Accessories />} />
              <Route path="/perfumes" element={<Perfumes />} />
              <Route path="/product/:handle" element={<ProductDetails />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/lucia" element={<AiPage />} />
              <Route path="/streaming" element={<Streaming />} />
              <Route path="/about" element={<About />} />
              <Route path="/community" element={<Community />} />
            </Routes>
            <AIAssistant />
            <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
            <GlobalTerminalRenderer />
            {/* <MusicPlayer /> */}
          </TerminalProvider>
        </CartProvider>
      </WishlistProvider>
    </ThemeProvider>
  );
}

import { useTerminal } from './context/TerminalContext';

function GlobalTerminalRenderer() {
  const { isOpen, closeTerminal, activeProduct } = useTerminal();
  return <PurchaseTerminal isOpen={isOpen} onClose={closeTerminal} product={activeProduct} />;
}

export default App;
