# JES - Proyecto Vite + React + Tailwind

## ✅ Stack Tecnológico

- **Vite 7.2.4** - Build tool ultra rápido
- **React 18** - Framework UI
- **Tailwind CSS 3.4.18** - Framework CSS utility-first
- **Framer Motion 12.1.18** - Animaciones React suaves y performantes

## 📁 Estructura del Proyecto

```
jes-vite/
├── src/
│   ├── components/
│   │   ├── Header.jsx          <- Header con glassmorphism
│   │   ├── ProductCard.jsx     <- Tarjetas de productos
│   │   └── FluidCursor.jsx     <- Cursor fluido (opcional)
│   ├── App.jsx                 <- Componente principal
│   ├── main.jsx                <- Entry point
│   └── index.css               <- Estilos globales con Tailwind
├── public/
│   └── assets/
│       └── logo.png            <- Logo JES
├── tailwind.config.js          <- Configuración Tailwind
└── package.json                <- Dependencias
```

## 🚀 Comandos

```bash
# Desarrollo (ya corriendo en puerto 5173)
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## 🎨 Características Implementadas

### ✅ Header con Glassmorphism
- Efecto `backdrop-blur` con Tailwind
- Sticky positioning
- Menú unificado (Productos, Juegos, Herramientas, Sobre Nosotros)
- Animaciones suaves con Framer Motion

### ✅ Tarjetas de Productos
- Grid responsive (4 → 2 → 1 columnas)
- Hover effects con elevación
- Animaciones stagger (aparecen una tras otra)
- 8 productos de prueba

### ✅ Animaciones
- **Framer Motion** en lugar de Anime.js
- Más performante y fácil de usar
- Integrado nativamente con React

## 📝 Cómo Agregar Componentes de Inspira UI

### Paso 1: Encuentra el componente
Ve a https://inspira-ui.com/ y elige un componente.

### Paso 2: Copia el código
Copia el código del componente de la documentación.

### Paso 3: Crea el archivo
```bash
# Ejemplo para un nuevo componente
src/components/NombreComponente.jsx
```

### Paso 4: Pega y adapta
- Pega el código copiado
- Ajusta las importaciones si es necesario
- Asegúrate de que use Tailwind CSS

### Paso 5: Usa en App.jsx
```jsx
import NombreComponente from './components/NombreComponente';

function App() {
  return (
    <>
      <NombreComponente />
      {/* resto de tu código */}
    </>
  );
}
```

## 🔧 Componentes Disponibles

### Ya creados:
- ✅ `Header.jsx` - Header con glassmorphism
- ✅ `ProductCard.jsx` - Tarjetas de productos
- ⚠️ `FluidCursor.jsx` - Necesita revisión (usa Canvas API)

### Listos para agregar (cuando quieras):
Cualquier componente de Inspira UI:
- Buttons (Gradient, Shimmer, Rainbow)
- Cards (3D, Flip, Glare)
- Cursors (Fluid, Smooth, Tailed)
- Backgrounds (Aurora, Liquid, Neural)
- Text Animations (Hyper, Morphing, Sparkles)

## 💡 Tips

### Glassmorphism con Tailwind
```jsx
className="bg-white/70 backdrop-blur-[20px] backdrop-saturate-[180%]"
```

### Animaciones con Framer Motion
```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
>
  Contenido
</motion.div>
```

### Hover Effects
```jsx
<motion.div
  whileHover={{ scale: 1.05, y: -4 }}
  transition={{ duration: 0.2 }}
>
  Tarjeta
</motion.div>
```

## 🌐 Servidor

- **Desarrollo**: http://localhost:5173/ (Vite)
- **Antiguo** (ya no usar): http://localhost:8000/

## 🔗 Enlaces Útiles

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Inspira UI Components](https://inspira-ui.com/)
- [Vite Guide](https://vitejs.dev/guide/)

---

**¡Proyecto listo para desarrollo! 🚀**

Todo funcionando correctamente. Ahora puedes agregar componentes de Inspira UI uno por uno.
