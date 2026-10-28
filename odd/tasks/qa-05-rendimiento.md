# QA-05: rendimiento y offline

## Objetivo y motivo

La app se promete ligera y usable en un móvil modesto, con datos que se quedan en el dispositivo. Hoy no hay ninguna comprobación automática de que el bundle no crezca sin control ni de que las métricas de Lighthouse no se degraden. Además, DOCS-01b dejó el OCR (tesseract.js más 24 MiB de datos de idioma) listo a nivel de paquete con carga diferida, pero nada impide que una tarea futura lo cuelgue del bundle inicial o lo meta en el precache del service worker. Esta tarea fija un presupuesto de rendimiento versionado y lo comprueba en la CI: si un PR lo supera, el check se pone en rojo.

## Alcance y restricciones

- Dentro:
  - Presupuesto de tamaño de bundle versionado (`apps/web/perf/budget.json`): tamaño máximo de JavaScript de primera carga por ruta de entrada y total, medido sobre la salida de `next build` de la web.
  - Script verificador sin dependencias nuevas (`scripts/check-bundle-budget.mjs`), con sus tests en vitest sobre una salida de build sintética.
  - Lighthouse en la CI contra el build de producción (`next build` + `next start`), con aserciones sobre las categorías y métricas fijadas en el presupuesto.
  - Guarda del camino crítico: comprobación de que `tesseract.js` y `pdfjs-dist` no aparecen en el JavaScript de primera carga y de que `sw.js` no precachea los activos de OCR (`/ocr`).
  - Documentación del presupuesto y del procedimiento para cambiarlo.
- Fuera:
  - Cablear el OCR en la interfaz: es de CARPETA-01 (la guarda solo protege el camino crítico).
  - Suites e2e offline completas: entran en QA-07.
  - Optimizaciones del código de la app: si la línea base no cumple el presupuesto, primero se mide, se fija un presupuesto realista y las optimizaciones se registran como tarea propia.
  - La exportación de escritorio: su salida se comprueba en la CI ya (check.yml); no se le añade presupuesto distinto en esta tarea.
- Invariantes del proyecto que aplican: sin dependencias nuevas sin justificar (el presupuesto se verifica con Node estándar; Lighthouse es la única dependencia nueva y es de desarrollo, para la CI); sin datos personales en fixtures ni logs; sin red nueva en la app (Lighthouse corre contra el servidor local de la CI).

## Superficie de edición (nuestra)

`scripts/**` (solo ficheros nuevos de esta tarea), `apps/web/perf/**` (nuevo), `apps/web/package.json` (solo script propio si hace falta), `package.json` raíz (devDependency de Lighthouse y script), `.github/workflows/check.yml`, `apps/web/public/sw.js` (solo lectura: la guarda lo comprueba, no lo cambia), `docs/**` (documento de rendimiento nuevo y backlog), `odd/tasks/qa-05-rendimiento.md`, `odd/reviews/qa-05.md`.

Aviso de carril: no se tocan `packages/**` ni los componentes de `apps/web/src`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `node --test`, igual que el resto de scripts de la raíz (`pnpm test:scripts`, que ya corre dentro de `pnpm check`). Los verificadores son scripts, no paquetes, así que siguen la convención de su carpeta y no la de `vitest`.
- RED observado: `scripts/check-bundle-budget.test.mjs` (11 tests) y `scripts/check-lighthouse-budget.test.mjs` (7 tests) fallaron con el módulo inexistente antes de escribir cada verificador. El de Lighthouse se escribió después del de tamaño, también en rojo.

## Riesgo y review (nuestra)

- Tipo: otro (infraestructura de CI).
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5 (toca la CI de entrega: un job nuevo que se cuelga o da verdes falsos bloquea a todos los carriles) y elemento 6 (sin el presupuesto en CI, una regresión de rendimiento entra en silencio). Mitigación: el job de Lighthouse tiene timeout y el verificador falla con un mensaje que dice qué ruta y qué medida se pasó.

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] Línea base medida: tamaños de primera carga de `next build` y Lighthouse local, registrados en este documento.
- [x] Tests en rojo del verificador de presupuesto.
- [x] `scripts/check-bundle-budget.mjs` + `apps/web/perf/budget.json` con la línea base congelada.
- [x] Job de Lighthouse en la CI contra el build de producción, con aserciones.
- [x] Guarda del camino crítico: sin tesseract ni pdfjs en primera carga. El precache del service worker ya estaba cubierto por `apps/web/src/test/pwa.test.ts`, que fija la lista exacta; no se duplica.
- [x] Documentación del presupuesto y backlog actualizado.
- [ ] `pnpm check` y `pnpm e2e` en verde.
- [x] Review gate con informe en `odd/reviews/qa-05.md` y una ronda de correcciones.

## Evidencia y progreso

Rama `lg/qa-05-rendimiento`, sobre `dev`.

### Línea base (build de producción, local)

Primera carga en gzip, medida con `medirPrimeraCarga` sobre el HTML prerenderizado de `pnpm build`:

| Ruta | Medido | Presupuesto |
|---|---|---|
| `/` | 169.5 KiB | 195.3 KiB |
| `/onboarding` | 172.4 KiB | 195.3 KiB |
| `/asistente`, `/ayudas`, `/datos`, `/familia`, `/hoy`, `/reclamar`, `/vida` | 178.5 KiB | 200.2 KiB |
| `/ajustes` | 180.4 KiB | 205.1 KiB |
| `/carpeta` | 181.1 KiB | 207.0 KiB |
| Suma de las 11 rutas | 1952.8 KiB | 2050.8 KiB |

Lighthouse 12.8.2 con el mismo build servido por `next start`, móvil emulado (dos corridas; entre paréntesis lo que cambió por el ruido de la herramienta):

| Métrica | `/` | `/hoy` |
|---|---|---|
| Rendimiento | 0.98 | 0.98 (0.99 en otra corrida) |
| Accesibilidad | 1 | 1 |
| Buenas prácticas | 0.96 | 0.96 |
| SEO | 1 | 1 |
| FCP | 1 218 ms | 1 508 ms |
| LCP | 2 352 ms | 2 260 ms |
| TBT | 10 ms | 28 ms |
| CLS | 0.003 | 0 |
| Speed Index | 1 218 ms | 1 508 ms |
| Peso | 253 KiB | 185 KiB |

Nota de método: un `next dev` de otra sesión ocupaba el puerto 3000 del equipo. Las medidas se hicieron contra `next start` en el 3111 y el 3210, nunca contra el servidor de desarrollo, que sirve chunks sin hash y sin minificar (medido por error al principio: 3 MiB en `main-app.js` y 0.70 de rendimiento).

### Qué quedó implementado

- `scripts/check-bundle-budget.mjs`: mide la primera carga por ruta y comprueba tamaño y camino crítico. Falla con ruta excedida, ruta nueva sin presupuesto, ruta presupuestada no medida, total excedido y chunk ausente.
- `apps/web/perf/budget.json`: el presupuesto versionado, con `porRuta`, `totalGzip`, `caminoCritico.prohibidos` (`tesseract`, `pdfjs`, `traineddata`) y el bloque `lighthouse`.
- `scripts/check-lighthouse-budget.mjs`: compara un informe de Lighthouse con los umbrales. Una categoría o métrica ausente, o con `score: null`, falla: un informe incompleto no es un aprobado.
- `scripts/run-lighthouse.mjs`: arranca `next start` en loopback, mide las rutas del presupuesto, comprueba cada informe y para el servidor siempre. Usa el Lighthouse del lockfile y el binario de Node, porque en Windows `spawn` de un `.cmd` falla con EINVAL.
- `.github/workflows/check.yml`: job `perf` con `timeout-minutes: 20` (`pnpm build`, `pnpm perf:bundle`, `pnpm perf:lighthouse`).
- 18 tests nuevos que corren en `pnpm check` vía `test:scripts`.

### Ronda de correcciones (review gate, aprobado con cambios)

Cuatro recomendados y tres notas, todos aplicados en la única ronda que permite el proyecto:

1. `totalGzip` estaba en 2 100 000 y la suma de los máximos por ruta es 2 257 000, así que el total quedaba por encima de lo que puede llegar a sumar el peor caso de las comprobaciones por ruta y no podía fallar cuando importa. Se baja a 2 030 000, por debajo de esa suma y un 1,5 % por encima de la línea base (1 999 669 bytes): ahora un crecimiento repartido entre rutas, que ninguna supera por sí sola, también falla. La tabla del documento se corrige a 1982.4 KiB de presupuesto total.
2. Una ruta cuyo HTML no referencia ningún script medía 0 KiB y aprobaba. Ahora es una violación propia (`sin-scripts`) y el chunk referenciado que falta se reporta antes como `chunk-ausente`, con su test.
3. `run-lighthouse.mjs` esperaba un 200 en el puerto y podía medir un servidor ajeno. Ahora falla si el proceso murió y exige que el servidor conozca el `BUILD_ID` de la build en disco. Probado con un intruso real en el 3210: sale con código 1 y lo explica.
4. Faltaban las líneas base de FCP, CLS y Speed Index que respaldan sus umbrales: medidas y añadidas a las tablas.
5. El mensaje de una métrica excedida decía "0 ms" para CLS; ahora CLS se formatea sin unidad y con tres decimales.
6. Dos sentencias en una línea, corregidas.
7. El número de paquetes de la dependencia ("155") no se reproducía contando el lockfile: son 147 entradas nuevas y pnpm informa de 155 instalados. Corregido con las dos cifras.

Queda como nota sin acción el pendiente humano de añadir `perf` a los checks requeridos de la rama protegida (H-10), documentado en `docs/rendimiento.md`.

### La CI encontró un fallo real del diseño (mientras se entregaba)

El primer run del job `perf` se puso en rojo: `/` con Total Blocking Time de 329 ms frente al umbral de 300, con el mismo build que en local daba 10 ms y 28 ms. No era una regresión de la app, era el ruido de medir una vez en un runner compartido. La corrección no fue subir el umbral (eso escondería la regresión real de mañana) sino medir tres veces por ruta y presupuestar la mediana (`mediana` y `combinarInformes` en `check-lighthouse-budget.mjs`, siete tests nuevos; `LG_PERF_REPS` para cambiar el número de corridas). La CI imprime las medidas de cada ruta que pasa, así que el log sirve de evidencia.

Medianas del primer run en verde: `/` con rendimiento 0.98, TBT 57 ms, LCP 2 419 ms; `/hoy` con rendimiento 0.99, TBT 102 ms, LCP 2 110 ms. Registradas en `docs/rendimiento.md`.

### Comprobado a mano

- `pnpm perf:bundle` sobre la build real: presupuesto cumplido y camino crítico limpio.
- `pnpm perf:lighthouse` sobre la build real: `/` y `/hoy` dentro del presupuesto, salida 0.
- El camino de fallo también: con un presupuesto de prueba exigente, el script sale con código 1 y nombra la categoría y la métrica que se pasan. Un presupuesto que solo sabe aprobar no protege de nada.

## Arreglo posterior: fallo del navegador en el job `perf`

Al preparar la entrega de `dev` a `main` (PR #76), `perf` se puso en rojo en `/` con `waiting for dynamic debugging port in chrome-err.log`, mientras `/hoy` medía bien en el mismo job y el run del push a `dev`, sobre el mismo commit, había pasado. Era el lanzador de Chrome fallando, y con `perf` como check requerido ese fallo bloqueaba la entrega.

Inmediato: re-ejecutar el job, que pasó. De fondo, rama `lg/qa-05-reintento-chrome`:

- `scripts/lighthouse-reintentos.mjs`: `medirConReintentos` y `mensajeSinMedida`, con cinco tests.
- Una corrida que falla entera se reintenta hasta `LG_PERF_INTENTOS` intentos en total, 2 por defecto.
- El presupuesto se comprueba fuera del reintento, así que el reintento no puede aprobar un presupuesto incumplido; si se agotan los intentos, la ruta falla y el mensaje dice que es infraestructura.
- Se reinicia a propósito cualquier fallo de Lighthouse: clasificar el error por su texto sería frágil, y el log dice qué intento falló, no por qué.

Review del arreglo: `jd-judge-a`, aprobado con cambios, con los dos recomendados aplicados (el aviso y la documentación prometían distinguir el fallo del navegador) y la nota del fichero de salida borrado antes de cada intento. Detalle en `odd/reviews/qa-05.md`.

## Siguiente paso

`pnpm check` y `pnpm e2e`, review gate y PR.

## Cambios de alcance aceptados

(ninguno todavía)
