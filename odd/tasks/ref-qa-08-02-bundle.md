# REF-QA-08-02: el presupuesto no debe contar polyfills que nadie descarga

## Objetivo y motivo

Sale del pase de arquitectura de la ola (`odd/reviews/ola-2.md`, hallazgo 2). `scripts/check-bundle-budget.mjs` suma todos los `<script src="/_next/...js">` del HTML prerenderizado. Entre ellos está el bloque de polyfills, que Next emite con `noModule=""`: un navegador que soporta módulos **no lo descarga**. Medido en la build actual, son 110.0 KiB crudos y **38.7 KiB gzip por ruta**, entre el 21 % y el 23 % de la primera carga presupuestada.

Consecuencia: el presupuesto mide algo que el navegador moderno no pide. Un presupuesto que no mide lo que se descarga deja de ser un presupuesto, y encima regala margen: una regresión real de 30 KiB cabría dentro del hueco de los polyfills sin poner la CI en rojo.

## Alcance y restricciones

- Dentro:
  - La medición separa lo moderno de lo legacy por el atributo `noModule` del propio `<script>`, sin listas de nombres de fichero.
  - La primera carga de cada ruta suma solo los scripts sin `noModule`.
  - El bloque legacy **no se ignora**: se mide aparte y tiene su propio límite por ruta, para que nadie engorde los polyfills sin que se vea.
  - El presupuesto se rebaja con la medida nueva y con el mismo criterio de margen que tenía.
  - La documentación explica qué se mide y qué no.
- Fuera:
  - Quitar los polyfills del build: son para navegadores sin soporte de módulos y el proyecto no ha decidido dejar de soportarlos.
  - Cambiar el nivel de navegadores objetivo o la lista de `browserslist`.
  - Tocar el job de `perf` o Lighthouse.
- Invariantes: ninguna cifra sin medir, y la guarda tiene que seguir fallando cuando hay que fallar (una regresión real no puede colarse por el hueco que se libera).

## Superficie de edición

`scripts/check-bundle-budget.mjs`, `scripts/check-bundle-budget.test.mjs`, `apps/web/perf/budget.json`, `docs/rendimiento.md`, `docs/backlog.md`, `odd/tasks/ref-qa-08-02-bundle.md`, `odd/reviews/ref-qa-08-02.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `node --test`, como el resto de scripts.
- RED: tres tests nuevos antes de tocar el medidor: un `<script>` con `noModule` no suma a la primera carga, sí suma al bloque legacy, y un bloque legacy por encima de su límite hace fallar la comprobación.

## Riesgo y review (nuestra)

- Tipo: infraestructura de CI.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 6, y es el importante: si la guarda se afloja en vez de afinarse, una regresión de rendimiento entra en verde. Mitigación: el test que exige que un script moderno siga contando, y el límite propio del bloque legacy.

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] RED: noModule no suma a la primera carga, sí al legacy, y el límite legacy falla al superarse.
- [x] El medidor separa por atributo y no por nombre de fichero.
- [x] `budget.json` rebajado con la medida nueva y con el bloque legacy presupuestado aparte.
- [x] `docs/rendimiento.md` con la diferencia entre primera carga moderna y bloque legacy.
- [x] `pnpm check` y `pnpm e2e` en verde, y `pnpm perf:bundle` sobre la build real.
- [x] Review gate con informe en `odd/reviews/ref-qa-08-02.md` y una ronda de correcciones.
- [ ] Backlog actualizado y PR.

## Evidencia y progreso

Rama `lg/ref-qa-08-02-bundle`, sobre `dev` (864439a).

### Medida antes y después

| Qué | Antes | Ahora |
|---|---|---|
| Primera carga de `/` | 169.5 KiB | 130.8 KiB |
| Primera carga de `/carpeta` | 181.1 KiB | 142.4 KiB |
| Suma de las once rutas | 1952.8 KiB | 1527.1 KiB |
| Bloque legacy | contado en la primera carga | 38.7 KiB, con tope propio |

Los 38.7 KiB que se quitaron de cada ruta son el bloque de polyfills (`110.0 KiB` crudos) que un navegador con soporte de módulos no descarga.

### Cómo se separa

`scriptsDeHtml` recorre los tags `<script>` y mira el atributo `noModule`, nunca el nombre del fichero: los nombres los pone el bundler y cambian con cada versión de Next. `medirPrimeraCarga` devuelve `gzip` y `ficheros` solo con lo moderno, y `legacyGzip` y `legacyFicheros` aparte. `chunk-ausente` y `sin-scripts` siguen mirando lo moderno, que es lo que decide si la ruta se midió.

### La guarda no se aflojó

Tres tests nuevos, escritos antes de tocar el medidor:

1. Un script con `noModule` no suma a `gzip` y sí a `legacyGzip`.
2. Un script moderno sigue contando: es el test que impide que esta tarea se convierta en un aflojamiento.
3. Un bloque legacy por encima de su tope hace fallar la comprobación.

Comprobado además sobre la build real con un presupuesto de prueba: con `maxLegacyGzipPorRuta` a 1 KiB, las once rutas fallan nombrando el bloque y su cifra.

### Presupuesto

`budget.json` con la medida nueva y el mismo margen del 12 % que tenía: 147.5 a 160.2 KiB por ruta, 1718.8 KiB de total (por debajo de la suma de máximos, para que un crecimiento repartido también falle) y `maxLegacyGzipPorRuta` en 43.9 KiB, que deja aire sobre los 38.7 reales sin perder la vigilancia.

### Un tropiezo, contado

Al reescribir `scriptsDeHtml` borré por accidente `htmlsPrerenderizados` y los tests lo cazaron al instante (cinco rojos que no tenían que ver con el cambio). Restaurada y 16 tests en verde. Está anotado porque el incidente no fue de diseño: fue de edición, y lo detectó la suite, que es lo que tiene que pasar.

## Evidencia y progreso

(pendiente)
