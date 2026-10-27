# Review gate DESK-01: build de dos salidas

---
tarea: DESK-01
base: 1f6c6a3
revisado: 3d9a1e4
revisor: jd-judge-a (contexto limpio, solo lectura, builds ejecutados)
veredicto: aprobado con cambios
---

## Resumen

El modo escritorio está inactivo por defecto: sin la variable, la configuración queda idéntica a la anterior y `pnpm build` produce las mismas rutas, con `/api/assistant` dinámica. El truco de `pageExtensions` está bien aplicado: se listaron todos los archivos de `apps/web/src/app` y todas las páginas y layouts son `.tsx`; el único `.ts` de ruta es `api/assistant/route.ts`, que es justo el que debe quedar fuera. Las dos salidas se verificaron ejecutándolas: la exportación contiene `index.html` con contenido real, las once rutas públicas, `404.html`, `sw.js` y el manifiesto, y ninguna coincidencia de `api`; la build de la web sigue intacta después y `.next` no se contamina porque el directorio de salida es distinto. El artefacto está ignorado y `build:desktop` limpia antes de construir, así que una exportación vieja no puede pasar. El paso de CI va en el job existente, después de la build de la web, sin descargar navegadores. Sin dependencias nuevas, sin tocar la interfaz, comentarios en español, sin rayas.

## Hallazgos

### 1. [recomendado] apps/web/next.config.ts:31

Problema: el modo se activaba solo con `LG_DESKTOP === "1"`; con `true` u otro valor se construía la web creyendo que era el escritorio, y `dist-desktop` no se generaba.
Propuesta: aceptar `1` y `true` y fallar con un mensaje claro ante cualquier otro valor. Aplicado: `modoEscritorio()` normaliza y lanza un error explicativo; verificado que la build de escritorio y la de la web siguen funcionando.

### 2. [nota] apps/web/next.config.ts:37

Problema: el truco depende de que las rutas futuras sigan siendo `.tsx`; un `page.ts` nuevo entraría en la web y desaparecería en silencio del escritorio.
Propuesta: dejarlo vigilado. Aplicado: `REF-DESK-01` en el backlog, con la comprobación de equivalencia de rutas entre las dos salidas.

### 3. [nota] apps/web/dist-desktop

La exportación incluye archivos de metadatos de Next además del HTML. Anotado en el documento de tarea para que el empaquetado de DESK-03 no los meta en el binario.

## Code smells

Ninguno relevante. El `node -e` del script de limpieza es denso pero correcto y evita una dependencia.

## Secretos

Ninguno.

## Qué se aplicó en la ronda de correcciones

El recomendado y las dos notas. Las dos salidas siguen en verde después del cambio.
