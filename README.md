# Impulse AI — Sitio web

Sitio corporativo estático de Impulse AI. HTML, CSS y un archivo JS sin dependencias ni paso de build: se sube tal cual a cualquier hosting estático.

Construido sobre el design system **Impulse AI Design System** (proyecto de Claude Design `fea5af64`). Los tokens de `assets/css/tokens.css` son una copia 1:1 de `tokens/*.css` del sistema.

## Estructura

```
index.html            Home: hero, productos, cómo nace un producto, respaldo, contacto
cierra.html           Producto Cierra — venta de parcelas de punta a punta
tapcar.html           Producto TapCar — control de flota con chip NFC
nosotros.html         Propósito, modelo de holding, productos, principios, cifras
contacto.html         Formulario completo y qué pasa después
assets/css/tokens.css Tokens de marca (color, tipo, espaciado, bordes, motion)
assets/css/site.css   Componentes y layout del sitio
assets/js/site.js     Menú móvil y validación del formulario
assets/img/           Símbolo en SVG (naranja, blanco, tinta) + favicon
.claude/launch.json   Config del servidor local de previsualización
```

## Ver el sitio

```bash
python -m http.server 4173
```

Luego abre `http://localhost:4173`. No funciona bien con `file://` porque las hojas de estilo se cargan por ruta relativa.

## Reglas de marca aplicadas

- **Color:** un solo color de marca, `#FF4D1F`, sobre neutros cálidos y tinta `#121212`. Proporción 70 neutros / 25 tinta / 5 naranja. En la home el naranja ocupa el bloque del hero (portada); en las páginas de producto el bloque es tinta y el naranja queda reservado al botón principal, a la marca y a los badges.
- **Tipografía:** Archivo 600 en titulares con tracking −3% a −3.5%; Archivo 400 en cuerpo con line-height 1.45 y medida máxima de 62ch. IBM Plex Mono solo en etiquetas, navegación y datos, siempre en mayúsculas con tracking 0.14em.
- **Superficies:** esquina recta (`--radius-card: 0`), borde de 1px `#DFDCD8`, cero sombras, cero gradientes, cero blur. Las secciones se separan con reglas de 1px.
- **Layout:** alineación a la izquierda, ancho máximo 1200px, margen de 32px (24px bajo 620px).
- **Capturas de producto:** el hero de `cierra.html` y `tapcar.html` muestra una captura de la interfaz real, con borde de 1px y esquina recta, apoyada sobre un panel de tinta que le da contraste.
- **Foco:** anillo naranja de 2px en cada elemento interactivo. No se elimina en ningún caso.
- **Voz:** resultado primero, frases cortas, sin jerga, sentence case en titulares, sin emoji ni signos de exclamación, trato de tú.

### Animación de la marca

El símbolo del hero corre en bucle infinito (`.mark--loop`, ciclo de 3s):

| Tramo | Qué pasa |
| --- | --- |
| 0–10% | El punto entra desde abajo a la izquierda |
| 10–50% | Se asienta en su posición del logo, con las estelas visibles |
| 50–80% | Acelera 15° hacia arriba y a la derecha hasta salir de cuadro (`ease-in`) |
| 80–100% | Pausa con el cuadro vacío antes de volver a empezar |

**Siempre hacia adelante, nunca en reversa.** Un `alternate` haría que el punto volviera cayendo hacia abajo, que lee como retroceso — lo contrario del impulso que representa la marca. La pausa entre ciclos es la que separa una repetición de la siguiente.

`.mark--animated` conserva la variante de una sola reproducción, por si se quiere usar en otra pieza. Ambas se desactivan con `prefers-reduced-motion`.

## Cifras usadas

Todas provienen de los sitios públicos de los productos o fueron entregadas directamente:

| Cifra | Origen |
| --- | --- |
| 2026, año de fundación | Dato entregado |
| 2 productos propios en operación | Cierra y TapCar |
| +100 vehículos operando con TapCar | tapcar.cl |
| 2 semanas de implementación, 2,5 UF/mes, 1 mes gratis | cierra.cl |
| 0 apps que instalar | tapcar.cl |
| Sin tope de vehículos | Dato entregado |

## Pendientes antes de publicar

1. **El formulario no envía nada.** `assets/js/site.js` valida y muestra la confirmación en pantalla, pero no hay backend. Hay que conectar el `submit` a un endpoint real (Formspree, una función serverless o tu propio API).
2. **Retail / e-commerce quedó fuera del sitio.** El design system la lista como vertical activa, pero no hay producto que la respalde, así que no se menciona. Si existe uno, se agrega como tercer producto.
3. **Verificar las cifras de precio de Cierra** antes de publicar: se leyeron de cierra.cl y los planes pueden cambiar.
4. **La dirección "Santiago, Chile"** es la única referencia de ubicación; confirmar si va una dirección real. El dominio confirmado es `impulseai.cl`.
5. **Las capturas son de las landings de los productos** (`assets/img/cierra-dashboard.png`, `assets/img/tapcar-ficha.png`), recortadas al panel de interfaz. Si el producto cambia de aspecto, hay que volver a capturarlas. Los originales sin recortar están en `Media/`, fuera del repositorio.
6. **Fuentes desde Google Fonts.** Si la marca compra una tipografía propia, se reemplaza el `<link>` de cada página y `--font-sans` en `tokens.css`.
7. Falta agregar `og:image`, `sitemap.xml` y `robots.txt` según el dominio final.
