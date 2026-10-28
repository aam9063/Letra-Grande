# Rendimiento y offline (QA-05)

Documento del presupuesto de rendimiento de la web: qué se mide, dónde vive el límite, cómo se comprueba en la CI y cómo se cambia.

## Qué se mide y por qué

Letra Grande se promete ligera y usable en un móvil modesto. El riesgo no es un día malo de un servidor: es que el peso de la app crezca sin que nadie lo note. DOCS-01b dejó el OCR (tesseract.js y unos 24 MiB de datos de idioma) listo para cargarse bajo demanda, y nada impedía que una tarea posterior lo colgara de un layout y lo metiera en la primera carga de todas las pantallas.

Se comprueban tres cosas, en la CI y en cada PR:

1. **Primera carga por ruta.** El JavaScript que referencia el HTML prerenderizado de cada ruta, medido en gzip. Es lo que alguien descarga antes de ver la pantalla.
2. **Camino crítico.** `tesseract`, `pdfjs` y `traineddata` no pueden aparecer en ese JavaScript. Si aparecen, una dependencia pesada se ha colado en un import de nivel superior o en un layout.
   Una ruta que no referencia ningún script de la build también es un fallo, no un aprobado: si Next cambia la forma de las etiquetas del HTML, el medidor no encuentra nada y una ruta de 0 KiB pasaría como si el build fuese perfecto.
3. **Lighthouse** contra el build de producción, en móvil emulado, sobre la portada y `/hoy`: categorías y métricas con umbral.

## Dónde vive el presupuesto

`apps/web/perf/budget.json`, versionado. Tres bloques:

- `porRuta`: gzip máximo de primera carga por ruta, en bytes.
- `totalGzip`: la suma de todas las rutas. Se presupuesta la suma, no el máximo, porque cada ruta paga su propia primera carga aunque comparta chunks. Está a propósito por debajo de la suma de los máximos por ruta: así un crecimiento repartido entre varias rutas, que ninguna supera por sí sola, también hace fallar la comprobación. Un total por encima de esa suma sería un chequeo que no puede fallar nunca.
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
| Suma de las once rutas | 1952.8 KiB | 1982.4 KiB |

Lighthouse 12.8.2 con el mismo build servido por `next start`, dos corridas en móvil emulado (la segunda entre paréntesis cuando cambia, que es el ruido normal de la herramienta):

| Métrica | `/` | `/hoy` | Umbral |
|---|---|---|---|
| Rendimiento | 0.98 | 0.98 (0.99 en otra corrida) | 0.85 |
| Accesibilidad | 1 | 1 | 1 |
| Buenas prácticas | 0.96 | 0.96 | 0.9 |
| SEO | 1 | 1 | 0.9 |
| First Contentful Paint | 1 218 ms | 1 508 ms | 2 500 ms |
| Largest Contentful Paint | 2 352 ms | 2 260 ms | 4 000 ms |
| Total Blocking Time | 10 ms | 28 ms | 300 ms |
| Cumulative Layout Shift | 0.003 | 0 | 0.1 |
| Speed Index | 1 218 ms | 1 508 ms | 4 000 ms |
| Peso de la página | 253 KiB | 185 KiB | no se presupuesta |

### Calibración con la CI

Una sola corrida de Lighthouse en un runner compartido no es una medida estable. En la primera ejecución del job `perf`, `/` sacó un Total Blocking Time de 329 ms con el mismo build que en local daba 10 ms, y el job se puso en rojo por azar. Por eso cada ruta se mide tres veces (`LG_PERF_REPS` para cambiarlo) y se presupuesta la mediana de cada categoría y métrica. El log de la CI imprime las medidas en cada corrida que pasa, así que sirven de evidencia y de histórico.

Medianas de la primera ejecución en verde del job, en el runner de GitHub (ubuntu-latest, móvil emulado):

| Métrica | `/` | `/hoy` | Umbral |
|---|---|---|---|
| Rendimiento | 0.98 | 0.99 | 0.85 |
| Accesibilidad | 1 | 1 | 1 |
| Buenas prácticas | 0.96 | 0.96 | 0.9 |
| SEO | 1 | 1 | 0.9 |
| First Contentful Paint | 1 064 ms | 761 ms | 2 500 ms |
| Largest Contentful Paint | 2 419 ms | 2 110 ms | 4 000 ms |
| Total Blocking Time | 57 ms | 102 ms | 300 ms |
| Cumulative Layout Shift | 0 | 0 | 0.1 |
| Speed Index | 1 064 ms | 767 ms | 4 000 ms |

Los umbrales de tiempos quedan entre dos y cinco veces por encima de estas medianas a propósito: el objetivo es cazar regresiones de verdad, no medir al milímetro en una máquina que no controlamos. Con la mediana, un pico aislado ya no decide el veredicto, así que no hace falta aflojar los números para que la CI deje de fallar por azar. Accesibilidad va a 1 sin margen: es un requisito del proyecto (AA), no una aspiración. El peso de la página no se presupuesta porque las métricas de Lighthouse ya lo cubren de forma indirecta y un límite de bytes totales penalizaría imágenes de contenido que no están en el camino crítico.

Estas cifras se miden en local. Las de la CI pueden salir algo peores por el runner compartido, y por eso los umbrales no son la línea base exacta.

## Cómo se comprueba en la CI

El job `perf` de `.github/workflows/check.yml`:

1. `pnpm build` (la web de servidor, no la exportación de escritorio).
2. `pnpm perf:bundle`: `scripts/check-bundle-budget.mjs` mide la primera carga de cada ruta prerenderizada y comprueba el tamaño y el camino crítico. Falla si una ruta se pasa, si aparece una ruta nueva sin presupuesto (crecimiento silencioso) y si una ruta presupuestada no se midió (build incompleto o ruta borrada).
3. `pnpm perf:lighthouse`: `scripts/run-lighthouse.mjs` arranca `next start` en loopback, mide cada ruta del presupuesto y compara con `scripts/check-lighthouse-budget.mjs`. Para el servidor siempre, también cuando falla. Usa el Lighthouse del lockfile, nunca `npx`. Cada corrida se reintenta una vez si Lighthouse no consigue arrancar el navegador (variable `LG_PERF_INTENTOS` para cambiarlo): en el PR #76 el lanzador de Chrome falló en `/` y no en `/hoy`, en el mismo job, y como `perf` es un check requerido ese fallo de infraestructura bloqueaba la entrega. Un fallo de arranque no es un presupuesto incumplido, y el mensaje lo dice así. Lo que el reintento no hace es aprobar una ruta que no se midió: si se agotan los intentos, el job falla.

Antes de medir comprueba dos cosas: que el proceso sigue vivo y que el servidor conoce el `BUILD_ID` de la build en disco. Sin eso, un puerto ya ocupado (el caso real: otro `next dev` en la misma máquina) haría medir el servidor equivocado y saldrían cifras que no son de nadie.

El job tiene `timeout-minutes: 20`: si Lighthouse se cuelga, el PR se pone en rojo en vez de quedarse esperando.

El job `perf` es un check requerido en `dev` y en `main` desde el 2026-10-28, junto con `check`, `e2e` y `review-report` (H-10): un PR no se puede fusionar si el presupuesto de rendimiento falla. Al ser el check más lento y el más sensible al ruido del runner, se añadió después de que diera verde en dos ejecuciones seguidas y con la mediana de tres corridas ya en su sitio. Si alguna vez bloquea por azar y no por una regresión, la discusión es sobre el umbral o el número de corridas (`LG_PERF_REPS`), no sobre quitarlo de la lista.

## La dependencia de Lighthouse

`lighthouse` (Apache-2.0, mantenida por Google, solo en `devDependencies`) es la única dependencia que añade esta tarea. Suma 147 entradas nuevas al `pnpm-lock.yaml` (`pnpm` informa de 155 paquetes instalados en el árbol) y ninguna al bundle que descarga quien usa la app: `apps/web/package.json` no la menciona y Next no la empaqueta. Las alternativas se descartaron por tamaño o por dependencia de un servicio: `@lhci/cli` añade más árbol para hacer lo mismo, y un servicio externo mandaría la URL de la app a un tercero, que es justo lo que el proyecto evita.

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
