const { useState, useEffect, useRef } = React;

// Productos de prueba
const productos = [
    { id: 1, nombre: "Procesador AMD Ryzen 9", precio: "$450.00", emoji: "💻" },
    { id: 2, nombre: "Memoria RAM 32GB", precio: "$120.00", emoji: "🎮" },
    { id: 3, nombre: "Comic Batman Vol. 1", precio: "$25.00", emoji: "📚" },
    { id: 4, nombre: "Vinilo Pink Floyd", precio: "$35.00", emoji: "🎵" },
    { id: 5, nombre: "Mouse Gaming RGB", precio: "$65.00", emoji: "🖱️" },
    { id: 6, nombre: "Teclado Mecánico", precio: "$85.00", emoji: "⌨️" },
    { id: 7, nombre: "Camiseta Anime", precio: "$30.00", emoji: "👕" },
    { id: 8, nombre: "Figura Coleccionable", precio: "$45.00", emoji: "🎭" }
];

// Componente principal
function App() {
    const headerRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        // Animación del header con logo
        anime({
            targets: headerRef.current,
            opacity: [0, 1],
            translateY: [-20, 0],
            duration: 800,
            easing: 'easeOutExpo'
        });

        // Animación del logo
        anime({
            targets: '.logo',
            opacity: [0, 1],
            scale: [0.9, 1],
            duration: 600,
            delay: 200,
            easing: 'easeOutExpo'
        });

        // Animación del container
        anime({
            targets: containerRef.current,
            opacity: [0, 1],
            duration: 800,
            delay: 400,
            easing: 'easeOutExpo'
        });
    }, []);

    return (
        <>
            <header className="header" ref={headerRef}>
                <div className="logo-container">
                    <img src="assets/logo.png" alt="JES" className="logo" />
                </div>
                <nav className="nav-menu">
                    <a href="#productos">Productos</a>
                    <a href="#juegos">Juegos</a>
                    <a href="#herramientas">Herramientas</a>
                    <a href="#sobre-nosotros">Sobre Nosotros</a>
                </nav>
            </header>

            <div className="container" ref={containerRef}>
                <p className="subtitle">Tu tienda nerd definitiva</p>

                <div className="features-grid">
                    {productos.map((producto, index) => (
                        <ProductCard
                            key={producto.id}
                            producto={producto}
                            delay={600 + (index * 100)}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

// Componente de tarjeta de producto
function ProductCard({ producto, delay }) {
    const cardRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        // Animación de entrada
        anime({
            targets: cardRef.current,
            opacity: [0, 1],
            translateY: [30, 0],
            duration: 600,
            delay: delay,
            easing: 'easeOutExpo'
        });
    }, [delay]);

    useEffect(() => {
        if (isHovered) {
            anime({
                targets: cardRef.current,
                translateY: -2,
                duration: 200,
                easing: 'easeOutQuad'
            });
        } else {
            anime({
                targets: cardRef.current,
                translateY: 0,
                duration: 200,
                easing: 'easeOutQuad'
            });
        }
    }, [isHovered]);

    return (
        <div
            className="feature-card"
            ref={cardRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="card-icon">{producto.emoji}</div>
            <h3>{producto.nombre}</h3>
            <div className="card-price">{producto.precio}</div>
        </div>
    );
}

// Renderizar la app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
