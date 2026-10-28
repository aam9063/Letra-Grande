# Rendimiento y offline (QA-05)

Documento del presupuesto de rendimiento de la web: qué se mide, dónde vive el límite, cómo se comprueba en la CI y cómo se cambia.

## Qué se mide y por qué

Letra Grande se promete ligera y usable en un móvil modesto. El riesgo no es un día malo de un servidor: es que el peso de la app crezca sin que nadie lo note. DOCS-01b dejó el OCR (tesseract.js y unos 24 MiB de datos de idioma) listo para cargarse bajo demanda, y nada impedía que una tarea posterior lo colgara de un layout y lo metiera en la primera carga de todas las pantallas.

Se comprueban tres cosas, en la CI y en cada PR:

1. **Primera carga por ruta.** El JavaScript que referencia el HTML prerenderizado de cada ruta, medido en gzip. Es lo que alguien descarga antes de ver la pantalla.
2. **Camino crítico.** `tesseract`, `pdfjs` y `traineddata` no pueden aparecer en ese JavaScript. Si aparecen, una dependencia pesada se ha colado en un import de nivel superior o en un layout.
3. **Lighthouse** contra el build de producción, en móvil emulado, sobre la portada y `/hoy`: categorías y métricas con umbral.

## Dónde vive el presupuesto

`apps/web/perf/budget.json`, versionado. Tres bloques:

- `porRuta`: gzip máximo de primera carga por ruta, en bytes.
- `totalGzip`: la suma de todas las rutas. Se presupuesta la suma, no el máximo, porque cada ruta paga su propia primera carga aunque comparta chunks.
- `caminoCritico.prohibidos`: cadenas que no pueden aparecer en la primera carga.
- `lighthouse`: rutas que se miden, nota mínima por categoría (0 a 1) y máximo por métrica (en milisegundos).

Los números son deliberadamente estrechos. Subir un límite es una decisión de producto y se ve en el diff del PR: quien lo suba tiene que explicar en la descripción qué se gana a cambio. Un presupuesto holgado no protege de nada.

## Línea base medida

Medido sobre `pnpm build` en la rama `lg/qa-05-rendimiento` (febrero de 2026), gzip de primera carga:

| Ruta | Medido | Presupuesto |
|---|---|---|
| `/` | 169.5 KiB | 195.3 KiB |
| `/onboarding` | 172.4 KiB | 195.3 KiB |
| `/hoy`, `/asistente`, `/ayudas`, `/datos`, `/familia`, `/reclamar`, `/vida` | 178.5 KiB | 200.2 KiB |
| `/ajustes` | 180.4 KiB | 205.1 KiB |
| `/carpeta` | 181.1 KiB | 207.0 KiB |
| Suma de las once rutas | 1952.8 KiB | 2050.8 KiB |

Lighthouse con el mismo build servido por `next start`, móvil emulado: `/` con 0.98 de rendimiento y `/hoy` con 0.99, accesibilidad 1 en las dos, buenas prácticas 0.96 y SEO 1. Los umbrales del fichero están por debajo de esas cifras para no ponerse en rojo por el ruido del runner, salvo accesibilidad, que va a 1 porque es un requisito del proyecto (AA) y no una aspiración.

Estas cifras se miden en local. Las de la CI pueden salir algo peores por el runner compartido, y por eso los umbrales no son la línea base exacta.

## Cómo se comprueba en la CI

El job `perf` de `.github/workflows/check.yml`:

1. `pnpm build` (la web de servidor, no la exportación de escritorio).
2. `pnpm perf:bundle`: `scripts/check-bundle-budget.mjs` mide la primera carga de cada ruta prerenderizada y comprueba el tamaño y el camino crítico. Falla si una ruta se pasa, si aparece una ruta nueva sin presupuesto (crecimiento silencioso) y si una ruta presupuestada no se midió (build incompleto o ruta borrada).
3. `pnpm perf:lighthouse`: `scripts/run-lighthouse.mjs` arranca `next start` en loopback, mide cada ruta del presupuesto y compara con `scripts/check-lighthouse-budget.mjs`. Para el servidor siempre, también cuando falla. Usa el Lighthouse del lockfile, nunca `npx`.

El job tiene `timeout-minutes: 20`: si Lighthouse se cuelga, el PR se pone en rojo en vez de quedarse esperando.

**Pendiente humano:** el job `perf` no está todavía entre los checks requeridos de las ramas protegidas (H-10). Mientras no se añada en GitHub, el job corre y se ve en el PR, pero un merge no queda bloqueado por él. Añadirlo es un cambio de ajustes del repositorio, no de código.

## La dependencia de Lighthouse

`lighthouse` (Apache-2.0, mantenida por Google, solo en `devDependencies`) es la única dependencia que añade esta tarea. Añade 155 paquetes al árbol de desarrollo y ninguno al bundle que descarga quien usa la app: `apps/web/package.json` no la menciona y Next no la empaqueta. Las alternativas se descartaron por tamaño o por dependencia de un servicio: `@lhci/cli` añade más árbol para hacer lo mismo, y un servicio externo mandaría la URL de la app a un tercero, que es justo lo que el proyecto evita.

## Cómo medir en local

```bash
pnpm build
pnpm perf:bundle          # tamaño y camino crítico, unos segundos
pnpm perf:lighthouse      # Lighthouse de / y /hoy, uno o dos minutos
```

Si `perf:bundle` dice que no hay ninguna ruta que medir, falta el build. Si `perf:lighthouse` dice que falta el build, lo mismo.

En Git Bash de Windows, un argumento de ruta que empieza por `/` se convierte en una ruta de Windows; los scripts lo toleran recortando el prefijo, y en la CI (Linux) el problema no existe.

## Cómo se cambia el presupuesto

1. Mide en local con el build de producción. Nunca con `pnpm dev`: en desarrollo Next sirve chunks sin hash y sin minificar, y las cifras no se parecen.
2. Si el crecimiento es intencionado, sube el límite afectado en `apps/web/perf/budget.json` y explica en la descripción del PR qué se gana.
3. Si es una regresión, no toques el presupuesto: busca el import que la causó. Un `import` de nivel superior en un layout es la causa habitual.

Un presupuesto que se sube en cada PR no es un presupuesto. Cuando toque subirlo, conviene dejar anotado en el documento de la tarea qué se ganó.

## Offline

El service worker (`apps/web/public/sw.js`) precachea solo el shell: `/hoy`, el manifiesto y los iconos. La lista exacta la fija `apps/web/src/test/pwa.test.ts`, que compara el `PRECACHE` con esos cuatro elementos: añadir `/ocr` o cualquier activo pesado rompe ese test antes de llegar a la CI.

Esa es la parte de offline que QA-05 protege. Los flujos offline completos (subir un documento sin conexión, abrir la carpeta, el asistente sin red) son de QA-07.
