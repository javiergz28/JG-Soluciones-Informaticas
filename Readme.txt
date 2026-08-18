# JG Soluciones Informáticas - Estructura del sitio web

Landing page de una sola página (HTML, CSS y JavaScript puro, sin build tooling),
con tema oscuro violeta/cian. Todo el contenido vive en index.html, navegado por
anclas: Inicio, Servicios, Precios, Contacto.

## Estructura de archivos:

JG Soluciones Informaticas\
├── index.html    # Landing completa: hero, servicios, precios, FAQ, contacto
├── styles.css    # Tema oscuro (variables CSS, cards, precios, acordeón FAQ, formulario)
├── script.js     # Scroll suave, slider de contacto, acordeón FAQ
├── Logo.png      # Logo principal

## Publicación:
Publicado en GitHub Pages desde la rama main.

## Notas:
- Los precios (sección #precios) están en pesos uruguayos y son orientativos;
  actualizalos directamente en index.html si cambian las tarifas.
- El formulario de contacto usa Formspree (sin backend propio).
- El proyecto FocusFrame (privacy.html, /focusframe) es un proyecto aparte,
  sin relación con JG Soluciones — no tocar al editar este sitio.
