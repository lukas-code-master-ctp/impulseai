# Impulse AI — Sitio web

Sitio corporativo estático de Impulse AI. HTML, CSS y un archivo JS sin dependencias ni paso de build: se sube tal cual a cualquier hosting estático.

Construido sobre el design system **Impulse AI Design System** (proyecto de Claude Design `fea5af64`). Los tokens de `assets/css/tokens.css` son una copia 1:1 de `tokens/*.css` del sistema.

## Estructura

```
index.html            Home        ->  /
cierra.html           Cierra      ->  /cierra
tapcar.html           TapCar      ->  /tapcar
nosotros.html         Nosotros    ->  /nosotros
contacto.html         Contacto    ->  /contacto
api/contacto.js       Función serverless: recibe el formulario y manda los correos
vercel.json           cleanUrls y trailingSlash
dev-server.py         Servidor local que imita a Vercel
assets/css/tokens.css Tokens de marca (color, tipo, espaciado, bordes, motion)
assets/css/site.css   Componentes y layout del sitio
assets/js/site.js     Menú móvil y validación del formulario
assets/img/           Símbolo en SVG, favicon y capturas de producto
.claude/launch.json   Config del servidor local de previsualización
```

## URLs

Las URLs no llevan `.html`. Lo resuelve `cleanUrls` en `vercel.json`, y los
enlaces internos ya apuntan a la forma limpia (`/cierra`, no `/cierra.html`).
Las rutas viejas no se rompen: Vercel redirige `/cierra.html` a `/cierra` con
un 308. Las rutas de recursos son raíz-relativas (`/assets/...`) para que
sobrevivan a cualquier forma de la URL.

Esto asume que el sitio vive en la raíz del dominio. Si algún día se sirve
desde un subdirectorio, hay que volver a rutas relativas.

## Ver el sitio

```bash
python dev-server.py
```

Luego abre `http://localhost:4173`. No sirve `python -m http.server`: devolvería
404 en las URLs limpias. `dev-server.py` replica las dos reglas de `vercel.json`,
así que lo que ves en local es lo que se publica. Tampoco funciona con `file://`.

## Formulario de contacto

Los dos formularios del sitio (el corto de la home y el completo de `/contacto`)
envían un `POST` con JSON a `/api/contacto`. La función manda dos correos con
[Resend](https://resend.com):

1. **Aviso interno** a `contacto@impulseai.cl`, con `reply_to` apuntando a quien
   escribió, para responderle directo desde la bandeja.
2. **Confirmación** a quien escribió, con copia de su mensaje y `reply_to` al
   buzón interno.

El aviso interno es el crítico: si falla, la respuesta es un 502 y el formulario
muestra el correo de contacto como alternativa. Si solo falla la confirmación, el
envío se da por bueno — el contacto ya llegó.

### Puesta en marcha

1. Crear la cuenta en Resend y **verificar el dominio `impulseai.cl`** (DNS: SPF y
   DKIM). Sin dominio verificado, Resend solo deja enviar desde `onboarding@resend.dev`
   y únicamente a tu propia dirección.
2. En Vercel, **Settings → Environment Variables**, agregar `RESEND_API_KEY` con la
   clave de Resend. Marcarla para Production, Preview y Development.
3. Volver a desplegar para que la variable quede disponible.

Si el remitente cambia, se ajustan `REMITENTE` y `BUZON` en `api/contacto.js`.

### Contra el spam

Hay un campo trampa (`website`) oculto para personas pero visible para robots: si
llega con contenido, la función responde éxito y no envía nada. Todo el texto que
escribe el usuario se escapa antes de entrar al HTML del correo, y las cabeceras
(asunto, destinatarios) se limpian de saltos de línea.

**Falta rate limiting.** Un atacante que conozca el endpoint puede llamarlo en
bucle y consumir tu cuota de Resend. Antes de que el sitio tenga tráfico real,
conviene agregar Vercel Firewall o un límite por IP.

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

1. **El formulario necesita `RESEND_API_KEY` en Vercel y el dominio verificado en Resend.** Sin eso responde un 500 con el correo de contacto como alternativa. Ver "Formulario de contacto" más arriba. Falta también rate limiting.
2. **Retail / e-commerce quedó fuera del sitio.** El design system la lista como vertical activa, pero no hay producto que la respalde, así que no se menciona. Si existe uno, se agrega como tercer producto.
3. **Verificar las cifras de precio de Cierra** antes de publicar: se leyeron de cierra.cl y los planes pueden cambiar.
4. **La dirección "Santiago, Chile"** es la única referencia de ubicación; confirmar si va una dirección real. El dominio confirmado es `impulseai.cl`.
5. **Las capturas son de las landings de los productos** (`assets/img/cierra-dashboard.png`, `assets/img/tapcar-ficha.png`), recortadas al panel de interfaz. Si el producto cambia de aspecto, hay que volver a capturarlas. Los originales sin recortar están en `Media/`, fuera del repositorio.
6. **Fuentes desde Google Fonts.** Si la marca compra una tipografía propia, se reemplaza el `<link>` de cada página y `--font-sans` en `tokens.css`.
7. Falta agregar `og:image`, `sitemap.xml` y `robots.txt` según el dominio final.
