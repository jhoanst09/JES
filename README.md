# JES - Tienda Nerd

## 📁 Estructura del Proyecto

```
probandoanti/
├── assets/
│   └── logo.png          <- Coloca tu logo aquí
├── index.html
├── app.js
├── styles.css
└── main.js
```

## 🎨 Cómo agregar tu logo

1. **Guarda tu logo** como `logo.png` en la carpeta `assets/`
2. **Formatos recomendados**: PNG con fondo transparente
3. **Tamaño recomendado**: 
   - Alto: 100-200px
   - Ancho: proporcional
   - El logo se ajustará automáticamente a 50px de alto (40px en móvil)

Si tu logo tiene otro nombre o formato, edita la línea 53 en `app.js`:
```javascript
<img src="assets/logo.png" alt="JES" className="logo" />
```

## 🔤 Tipografías disponibles

Actualmente estás usando **Inter** (moderna y limpia). Para cambiar:

### Opción 1: Usar otra Google Font

Edita la línea 2 en `styles.css`:

**Fuentes modernas recomendadas:**
```css
/* Poppins - Moderna y amigable */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

/* Montserrat - Elegante y profesional */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

/* Space Grotesk - Futurista y tech */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');

/* Outfit - Limpia y moderna */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

/* JetBrains Mono - Estilo código/nerd */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
```

Luego actualiza la variable en la línea 17:
```css
--font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Opción 2: Usar fuente personalizada

1. Coloca tu archivo de fuente en `assets/fonts/`
2. Agrega en `styles.css`:
```css
@font-face {
    font-family: 'MiFuente';
    src: url('assets/fonts/mifuente.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
}
```

## 🚀 Servidor local

El servidor está corriendo en: http://localhost:8000

Para reiniciar:
```powershell
python -m http.server 8000
```
