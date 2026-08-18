# JG Soluciones Informáticas — Sitio web

Landing de una sola página en HTML + CSS + JS, sin build ni dependencias.
Objetivo del sitio: generar consultas por WhatsApp y llamadas.

## Archivos

index.html                Landing completa (única página real)
styles.css                Sistema de diseño en tokens CSS + componentes
script.js                 Nav mobile, scroll reveal, FAQ, envío del formulario
Logo.png                  Logo, recortado al contenido (antes traía ~70% de padding vacío)
favicon-32.png            Favicon 32x32, generado del logo
apple-touch-icon.png      Icono 180x180 para iOS
robots.txt, sitemap.xml   SEO
404.html                  Redirect al inicio
.gitignore                Excluye .vs/ y basura del SO

Fuera de esta landing, el repo también contiene focusframe/ y privacy.html,
que son otro proyecto. GitHub Pages los sirve igual desde el mismo dominio.

## Sistema de diseño

Generado con la skill ui-ux-pro-max (patrón "Trust & Authority + Conversion",
estilo Flat Design, dials variance 4 / motion 3 / density 5).

Todo el color, la tipografía, el espaciado y el motion salen de variables CSS
declaradas en :root dentro de styles.css. Para cambiar la identidad visual del
sitio, tocá los tokens — no los componentes.

Tipografía: Poppins (títulos) + Open Sans (texto), vía Google Fonts.
Color base: azul #1E40AF (confianza) + naranja #C2410C (acción) + verde WhatsApp.
El cian de la marca es #0093CF: da 3.46:1 sobre blanco, así que sirve para
elementos gráficos pero no para texto corrido.
Dark mode automático por prefers-color-scheme.
Todos los pares texto/fondo cumplen WCAG AA (4.5:1) o mejor.

## Reglas al editar

- No uses emojis como iconos: hay un sprite SVG al inicio de index.html.
- Todo target clickeable debe medir al menos 44px de alto.
- Nunca quites el focus ring sin poner un reemplazo visible.
- Cualquier animación nueva tiene que respetar prefers-reduced-motion.
- Los links de WhatsApp llevan un mensaje pre-cargado distinto por sección:
  así sabés de dónde vino la consulta sin necesidad de analytics.
- GitHub Pages corre en Linux y distingue mayúsculas: verificá que cada ruta
  de archivo coincida exactamente con el nombre real.

## Pendientes / mejoras sugeridas

- [ ] Pedir una variante del logo con "INFORMÁTICAS" en color, no en blanco:
      hoy esa palabra y el cuerpo del laptop son blancos, así que el logo solo
      se puede usar sobre fondo oscuro. Por eso el header y el footer son oscuros.
- [ ] Publicar testimonios reales (hay un bloque comentado en index.html listo).
      No inventar testimonios: sin nombre y empresa no generan confianza.
- [ ] Si en algún momento se factura, reponer la pregunta de facturación en el FAQ.
- [ ] Convertir Logo.png a WebP y servir un favicon.ico de 32x32
      (el favicon actual pesa 93 KB, es una PNG grande).
- [ ] Definir precios de referencia o rangos: el motor de diseño marca
      "transparent pricing" como factor de conversión para servicios locales.
- [ ] Considerar dominio propio (jgsoluciones.uy) en lugar de github.io.

## Publicación

GitHub Pages, rama main, carpeta raíz.
URL: https://javiergz28.github.io/JG-Soluciones-Informaticas/
