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
- [ ] Review gate con informe en `odd/reviews/qa-05.md` y una ronda de correcciones.

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

Lighthouse 12.8.2 con el mismo build servido por `next start`, móvil emulado:
`/` rendimiento 0.98, accesibilidad 1, buenas prácticas 0.96, SEO 1, LCP 2.4 s, TBT 10 ms, 248 KiB.
`/hoy` rendimiento 0.99, accesibilidad 1, buenas prácticas 0.96, SEO 1, LCP 2.1 s, TBT 30 ms, 181 KiB.

Nota de método: un `next dev` de otra sesión ocupaba el puerto 3000 del equipo. Las medidas se hicieron contra `next start` en el 3111 y el 3210, nunca contra el servidor de desarrollo, que sirve chunks sin hash y sin minificar (medido por error al principio: 3 MiB en `main-app.js` y 0.70 de rendimiento).

### Qué quedó implementado

- `scripts/check-bundle-budget.mjs`: mide la primera carga por ruta y comprueba tamaño y camino crítico. Falla con ruta excedida, ruta nueva sin presupuesto, ruta presupuestada no medida, total excedido y chunk ausente.
- `apps/web/perf/budget.json`: el presupuesto versionado, con `porRuta`, `totalGzip`, `caminoCritico.prohibidos` (`tesseract`, `pdfjs`, `traineddata`) y el bloque `lighthouse`.
- `scripts/check-lighthouse-budget.mjs`: compara un informe de Lighthouse con los umbrales. Una categoría o métrica ausente, o con `score: null`, falla: un informe incompleto no es un aprobado.
- `scripts/run-lighthouse.mjs`: arranca `next start` en loopback, mide las rutas del presupuesto, comprueba cada informe y para el servidor siempre. Usa el Lighthouse del lockfile y el binario de Node, porque en Windows `spawn` de un `.cmd` falla con EINVAL.
- `.github/workflows/check.yml`: job `perf` con `timeout-minutes: 20` (`pnpm build`, `pnpm perf:bundle`, `pnpm perf:lighthouse`).
- 18 tests nuevos que corren en `pnpm check` vía `test:scripts`.

### Comprobado a mano

- `pnpm perf:bundle` sobre la build real: presupuesto cumplido y camino crítico limpio.
- `pnpm perf:lighthouse` sobre la build real: `/` y `/hoy` dentro del presupuesto, salida 0.
- El camino de fallo también: con un presupuesto de prueba exigente, el script sale con código 1 y nombra la categoría y la métrica que se pasan. Un presupuesto que solo sabe aprobar no protege de nada.

## Siguiente paso

`pnpm check` y `pnpm e2e`, review gate y PR.

## Cambios de alcance aceptados

(ninguno todavía)
