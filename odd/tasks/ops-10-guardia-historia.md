# OPS-10: guardia de historia en la entrega a main

## Objetivo y motivo

El trabajo del escritorio llegó a `main` en un solo commit squash ("Dev #35") mientras `dev` tenía esos mismos cambios en sus commits propios. La entrega siguiente de `dev` a `main` marcó diez conflictos que no eran de contenido, y resolverlos a mano es donde se pierden cambios sin que nadie lo vea. Esta tarea hace que el repositorio avise antes de repetirlo.

## Alcance y restricciones

- Dentro: un script que falla cuando un PR a `main` no lleva la historia de `main`, sus tests, el enganche en el job `check` y la regla escrita en `docs/review-gate.md`, `docs/ARRANQUE.md` y `CONTRIBUTING.md`.
- Fuera: cambiar cómo se protege `main` en GitHub (H-10), tocar los checks existentes y cambiar la política de squash para las ramas de tarea hacia `dev`, que sigue siendo squash.
- Invariantes: la comprobación no puede dar falsos rojos en `dev` ni en los push, y tiene que explicar el arreglo, no solo fallar.

## Superficie de edición (nuestra)

`scripts/check-main-history.mjs`, `scripts/check-main-history.test.mjs`, `.github/workflows/check.yml`, `docs/review-gate.md`, `docs/ARRANQUE.md`, `CONTRIBUTING.md`, `docs/backlog.md`, `odd/tasks/ops-10-guardia-historia.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `node --test` para la lógica de decisión, que es la que puede equivocarse.
- RED: los tests de la decisión antes del script.

## Riesgo y review (nuestra)

- Tipo: entrega y CI.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5 (entrega: un falso rojo bloquea todas las entregas a `main`, y un falso verde no protege de nada).

## Tareas

- [x] Script con la decisión aislada y mensaje accionable.
- [x] Tests de la decisión: no aplica fuera de `main`, acepta la rama que lleva la historia y rechaza la que no.
- [x] Enganche en el job `check`, con historia completa y los tests del propio script.
- [x] Regla escrita en la documentación de entrega.
- [x] `pnpm check` en verde y los 10 tests del script en verde.

## Evidencia y progreso

Rama `lg/guardia-historia-main`.

- `scripts/check-main-history.mjs`: `evaluarHistoria({ base, esAncestro, commitsSoloEnBase })` devuelve `{ ok, mensaje }`. Solo mira los PRs cuyo destino es `main`; con cualquier otro destino, o en un push, no aplica. Cuando falla, lista los commits que faltan y escribe el arreglo exacto (`git merge origin/main` en la rama, contenido de la rama, commit de fusión).
- 10 tests con `node --test`, que se ejecutan en el job `check`: la decisión, el recorte de la lista de commits, el arreglo con la rama de verdad y el script como programa (código 1 y arreglo en stderr con repositorios temporales). Si la comprobación se rompe, la build se rompe.
- Se comprueba el commit de la rama (`GITHUB_HEAD_SHA`): en el merge ref de un PR, `main` es ancestro por construcción y la guardia daría verde siempre. Lo cazó la review.
- `check` con `fetch-depth: 0` y el paso nuevo; el resto del workflow igual.
- La regla queda escrita en `docs/review-gate.md` (sección nueva que cuenta el incidente), en la política de entrega de `docs/ARRANQUE.md` y en `CONTRIBUTING.md`.

## Siguiente paso

Review gate y merge a `dev`.

## Cambios de alcance aceptados

Ninguno: la tarea nace de un incidente real y se limita a prevenirlo.
