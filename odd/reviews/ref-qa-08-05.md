# Review gate REF-QA-08-05: limpieza menor del pase

---
tarea: REF-QA-08-05
base: 231fac8
revisado: 231fac8
revisor: jd-judge-a
veredicto: aprobado con cambios
---

## Resumen

Revisados los tres cambios de la última REF del pase: `zod` fuera de `packages/ai`, `react-dom` a `devDependencies` en `packages/design` y diez documentos renombrados de mayúsculas a minúsculas. Los cambios son correctos y la verificación está en verde, pero el revisor encontró **dos problemas de honestidad documental** que importan: mi justificación del cambio de `react-dom` era falsa, y quedaban trece referencias escritas a mano a los nombres viejos, que eran justo el motivo del renombrado. Aplicado en la única ronda.

## Hallazgos

### 1. [recomendado] odd/tasks/ref-qa-08-05-limpieza.md

Problema: el documento justificaba mover `react-dom` a desarrollo diciendo que la galería "no se exporta desde el barrel". **Es falso**: `packages/design/src/index.ts:29` exporta `buildGalleryHtml` desde `gallery/generate`, que importa `react-dom/server` estáticamente, y `apps/web` importa el barrel en runtime. El cambio no rompe (la web declara su propio `react-dom` y los `devDependencies` de paquetes privados del workspace se instalan siempre), pero la premisa que lo sostenía estaba mal, y eso es lo que hereda la siguiente persona.
Aplicado: el motivo reescrito con la razón real, y el olor de fondo (exportar una herramienta de desarrollo desde el barrel) registrado como `REF-QA-08-05b`.
Esfuerzo: S.

### 2. [recomendado] odd/tasks y odd/reviews, trece referencias

Problema: el motivo del renombrado era que las referencias escritas a mano fallan en un sistema de ficheros sensible a la caja. Pues quedaban doce o trece referencias a `odd/reviews/UI-0x.md` y `odd/tasks/UI-0x-*.md` dentro de los propios documentos.
Aplicado: todas pasadas a minúsculas. Verificado que no queda ningún `odd/reviews/UI-0` ni `odd/tasks/UI-0` en `odd/` ni en `docs/`.
Esfuerzo: S.

### 3. [recomendado] docs/backlog.md

Problema: la fila de `REF-QA-08-05` seguía describiendo la deuda como pendiente y repetía las dos imprecisiones (que `client.ts` usa `react-dom`, cuando solo lo menciona en un comentario, y el cuento del barrel). La regla 9 de AGENTS.md pide actualizar el backlog en el mismo PR.
Aplicado: la fila dice ahora qué se hizo, qué no y por qué, con las dos deudas nuevas.

### 4. [nota] Deuda de `radar` prometida y no registrada

El documento decía que los valores de `UnidadPlazo` en snake_case quedaban registrados como deuda aparte, y no había ninguna fila. Aplicado como `REF-QA-08-05c`.

### 5. [nota] "Cinco líneas idénticas"

Los dos `setup.ts` son once líneas, no cinco. Corregido. La conclusión de no unificarlos se mantiene: los dos `vitest.config.ts` difieren de verdad (proyectos y alias en la web).

### 6. [nota] Ficheros sin trackear

`DesignUI/`, `test-results/`, `apps/web/public/img1.jpg` y `apps/web/public/landing.png` siguen fuera del control de versiones, sin ignorar. Ninguno entra en el commit.

## Comprobaciones propias del revisor

- `grep` de `react-dom` en `packages/design/src`: solo `gallery/generate.tsx:3` lo importa; `client.ts` y `Gallery.tsx` lo citan en comentarios.
- Verificado que el barrel reexporta el generador (`index.ts:29`) y que la web importa el barrel.
- Resolución de `react-dom/server` desde `packages/design`: correcta con la dependencia en dev.
- `vitest` de la galería en `packages/design`: 5 en verde con el cambio.
- `zod`: cero usos en `ai`; `schema` lo declara y lo usa. Lockfile coherente.
- `git status`: los diez renombrados aparecen como `R`, con historial preservado.
- `scripts/check-review-report.mjs` con títulos `UI-03: landing pública`, `ui-06: ajustes` y `UI-03a: parte 1`: los tres pasan y encuentran el informe renombrado.
- Sin rayas largas, medias rayas ni `any`.

## Qué se aplicó en la ronda de correcciones

Los tres recomendados y las tres notas. La verificación de conjunto (`pnpm check`, `pnpm build` y `pnpm e2e`) estaba en verde antes de la ronda y la ronda solo tocó documentación y referencias, así que la repite la CI de este PR.
