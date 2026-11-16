---
name: jg-nextgen
description: "Invocar, continuar, auditar o ejecutar el proyecto web JG Next Gen / JG Soluciones Informáticas desde distintos chats, utilizando un único documento maestro de GitHub. Activar cuando el usuario diga 'JG Next Gen', 'CORE-01', 'retomemos la web JG', 'continuá el checkpoint' o pida explícitamente '/jg-nextgen'."
---

# JG Next Gen — Skill de continuidad

## Alcance
Coordinar de forma segura el proyecto JG Next Gen entre varios chats, sin reiniciar decisiones, repetir trabajo ni crear documentación paralela. Esta skill define **el procedimiento**; el estado y las decisiones vigentes residen **solo** en el documento maestro de GitHub.

- Documento maestro canónico: https://github.com/javiergz28/JG-Soluciones-Informaticas/issues/1
- Repo y web LIVE: `javiergz28/JG-Soluciones-Informaticas` / https://javiergz28.github.io/JG-Soluciones-Informaticas/
- Repo DEV objetivo: `javiergz28/jgsinformatica`. **Comprobar su existencia**; nunca tratarlo como creado sin verificarlo.
- `/jg-nextgen` es un **alias textual de invocación** en conversaciones, no prometer que ChatGPT haya registrado un comando de barra nativo.

## Protocolo obligatorio al comenzar

1. Identificar que la tarea realmente se refiere a **JG Next Gen**, no a otros proyectos de «Ideas de Javier».
2. **Leer el Issue #1 completo mediante GitHub conectado**, incluyendo estado, checkpoint, decisiones, criterios de salida y bloqueos. Verificar si sigue accesible y vigente.
3. Consultar el estado real de los repositorios y la rama/archivos afectados antes de escribir. No asumir que una propuesta de otro chat se implementó.
4. Mostrar brevemente: checkpoint actual, qué está verificado, entregable mínimo de esta sesión, riesgos y archivos que se tocarán.
5. Si falta GitHub, no inventar el estado ni declarar que hay memoria sincronizada; informar el bloqueo y trabajar únicamente con datos comprobados.

## Reglas de ejecución

- **Una fase pequeña y verificable por vez**. Aprender lo indispensable, diseñar, implementar, probar y registrar; no generar prototipos desechables ni pruebas repetitivas sin hipótesis.
- **No tocar la rama `main` ni GitHub Pages LIVE, ni fusionar/desplegar a producción**, salvo autorización expresa y específica del usuario. Preferir repo DEV aislado y cambios con commits pequeños.
- Preservar el contenido comercial existente: identidad, servicios, precios, cobertura, garantías, formularios, URLs, SEO, rutas y proyectos ajenos como `focusframe/`. Confirmar vigencia antes de promocionar cambios.
- Mantener la identidad aprobada del Issue: **cyberpunk minimalista, CORE-01 sobria, tipografía editorial grande, transformación continua BOOT → HARDWARE → CONNECT → INTELLIGENCE → CONTACT y portfolio real**. El contacto debe funcionar sin completar el recorrido.
- **Performance desde el diseño**: imagen inicial visible sin JS/Canvas, recursos progresivos y bajo demanda, diseño móvil propio, `prefers-reduced-motion`, fallbacks y accesibilidad. No marcar métricas como logradas sin medirlas.
- No suponer que imágenes conceptuales son modelos 3D editables. Evitar introducir bibliotecas o plugins que no resuelvan una necesidad medida.
- Nunca copiar elementos protegidos de la referencia ni publicar secretos, datos privados o claims técnicos no verificados.


## Control de pushes y sincronización de GitHub (obligatorio)

**Esto es una política de verificación en cada sesión, NO monitoreo automático en tiempo real.**

1. **Antes de cambios locales:** identificar repositorio, rama, SHA remoto HEAD, último commit y estado del árbol local; si existe clon, ejecutar `git fetch --prune` antes de comparar y no empezar sobre ramas desactualizadas. Nunca ejecutar `git pull` indiscriminadamente sobre cambios sin confirmar.
2. **Antes de commit/push:** comprobar `git status`, `git diff`, archivos afectados y SHA de referencia; detectar cambios de terceros, conflictos y divergencias antes de integrar. No usar `git push --force` ni sobrescribir trabajo ajeno sin autorización.
3. **Canal autorizado:** commits funcionales solo en repositorio DEV o rama feature aprobada; nunca `main` LIVE por defecto. No asumir que cambios en una rama ya están desplegados en Pages.
4. **Después de push:** leer **GitHub remoto** (SHA de la rama, commit, diff y estado del despliegue si existe) y comparar contra lo que se envió. Un `git push` exitoso no prueba que Pages desplegó, ni que la web esté sana.
5. **Registro único:** actualizar el Issue #1 con `repo`, `branch`, `base_sha`, `new_sha`, archivos, pruebas, despliegue DEV y resultado del control de producción. Registrar explícitamente si falta algún dato de verificación.
6. **Entre chats:** el siguiente chat debe revalidar GitHub antes de confiar en el Issue; si hay discrepancias, suspender escrituras y reconciliar diferencias, preservando el trabajo de otros.
7. **Automatización opcional:** GitHub Actions/webhooks o comprobaciones programadas requieren implementación independiente, pruebas y acceso; **no afirmar vigilancia continua** hasta verla activa y probada.

## Definición de terminado (DoD)

Un checkpoint solo pasa a **VERIFICADO** si existen:
1. Entregable concreto (archivo, commit, URL u objeto inspeccionable).
2. Pruebas con resultados, fallos y limitaciones explícitos.
3. Validación de que LIVE no sufrió cambios.
4. Registro en el **mismo Issue #1**, conservando secciones anteriores.
5. Aprobación del usuario cuando implique fijar una dirección creativa o publicar.

No confundir `PROPUESTO`, `DEFINIDO`, `IMPLEMENTADO`, `VERIFICADO` y `APROBADO`.

## Cierre de cada sesión

- **Releer** el Issue actual antes de actualizar, para no pisar cambios de otro chat.
- Actualizar **el cuerpo del Issue #1**, sin crear nuevos informes, issues o README de seguimiento. Registrar fecha UYT, checkpoint, decisiones nuevas, archivos/commits/URLs efectivamente cambiados, pruebas, pendientes y siguiente acción única.
- Si el guardado falla, declararlo; no decir que la memoria quedó actualizada.
- Responder brevemente con: **Hecho · Evidencia · Pendiente · Próximo checkpoint** y enlazar el Issue maestro.

## Al invocarla solo para saber el estado

Leer GitHub y devolver el estado real y el siguiente checkpoint; **no iniciar modificaciones** sin una tarea de ejecución explícita.

## Relación con ChatGPT Projects

La skill y el Issue **no cambian automáticamente** la configuración de Memoria o Instrucciones del proyecto de ChatGPT. Las instrucciones del proyecto deben remitir al Issue y exigir este protocolo cuando la conversación trate de JG Next Gen. No prometer instalación automática de esta skill si no se verificó.
