# OPS-05: review gate documentado y exigible en CI

## Objetivo y motivo

Convertir la revisión tras cada implementación (sección 22) en un paso obligatorio y no en una buena intención: documentar el gate, fijar el formato del informe, añadir la casilla de review a la plantilla de PR y hacer que la CI falle cuando un PR con id de tarea no adjunta su informe. Sin esto, el gate depende de la memoria de quien implementa.

## Alcance y restricciones

- Dentro: `docs/review-gate.md` (las dos capas, el prompt del revisor, el formato del informe, las métricas y las reglas anti-bucle), `odd/reviews/_template.md`, `.github/PULL_REQUEST_TEMPLATE.md` con la casilla de review y la de datos, `scripts/check-review-report.mjs` y su paso en `.github/workflows/check.yml`.
- Fuera: la plantilla de datos y la guía de contribución (`CONTENT-01`), el pase de arquitectura por ola (`QA-08`), cualquier intento de sustituir la revisión nativa por riesgo (RDD sigue activa).
- Invariantes del proyecto que aplican: una sola ronda de correcciones; el revisor no escribe código; los refactores opcionales se registran como `REF-<id>` y no se ejecutan; un PR sin informe no puede pasar.
- Decisión de superficie: `.github/PULL_REQUEST_TEMPLATE.md` pertenece a esta tarea, para que `CONTENT-01` no edite el mismo archivo en paralelo.

## Superficie de edición (nuestra)

`docs/review-gate.md`, `odd/reviews/_template.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `scripts/check-review-report.mjs`, `.github/workflows/check.yml`.

## Modo TDD (nuestra)

- Activo: sí, sobre el script de comprobación.
- Runner: `vitest` no aplica: el script es una herramienta de CI sin paquete propio. Se prueba con `node --test` en `scripts/check-review-report.test.mjs`, ejecutable sin dependencias nuevas.
- RED: un PR con id de tarea y sin `odd/reviews/<id>.md` falla con un mensaje que dice exactamente qué archivo falta; con informe pasa; un PR sin id de tarea se salta la comprobación y lo deja escrito en la salida.

## Riesgo y review (nuestra)

- Tipo: entrega y CI.
- Review gate: obligatorio (sección 22). En esta tarea la revisión la hace otra persona del equipo mediante el propio gate, con el informe en `odd/reviews/ops-05.md`.
- Riesgo: elemento 5 (un gate mal hecho bloquea PRs legítimos o, peor, aprueba en falso). Review centrada en: extracción del id del título, comportamiento cuando no hay id, rutas del informe, mensajes de error accionables y que el script no pueda pasar por un fallo silencioso.

## Tareas

- [x] T1: `docs/review-gate.md` con las dos capas, prompt del revisor, formato y anti-bucle.
- [x] T2: `odd/reviews/_template.md` con el frontmatter de la sección 22.6.
- [x] T3: `scripts/check-review-report.mjs` con sus tests (RED primero).
- [x] T4: plantilla de PR con las casillas de verificación y de review, y paso en el workflow.
- [x] T5: probar el script contra un PR de prueba sin informe y con informe.

## Evidencia y progreso

- RED: las pruebas de `node --test` fallaban con `ERR_MODULE_NOT_FOUND` antes de existir el script; y el primer CLI salía con 0 en silencio por un `join` con `argv[1]`, detectado por una prueba nueva y corregido.
- GREEN: 8 de 8 pruebas con `node --test scripts/check-review-report.test.mjs`.
- Los tres casos reales: título con id y sin informe (salida 1, mensaje que nombra la ruta exacta), título con id e informe (salida 0, front matter y veredicto válidos), título sin id (salida 0, la comprobación no aplica).
- El analizador tolera un título H1 antes del front matter, que es como están escritos los informes reales.
- `pnpm check` en la raíz en verde.
- Limitación conocida: el job `review-report` de la CI no se puede ejecutar en local; depende de `github.event.pull_request.title`, disponible en eventos `pull_request`.

## Siguiente paso

Deja el gate activo para todas las tareas de la Ola 2 en adelante.

## Cambios de alcance aceptados

Ninguno.
