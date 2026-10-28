# OPS-11: sincronización automática de dev con main

## Objetivo y motivo

Cada entrega a `main` deja un commit de fusión que `dev` no tiene. La protección de `main` exige la rama al día y la guardia de OPS-10 bloquea la entrega siguiente, así que después de cada entrega hay que abrir un PR de sincronización a mano. Ha pasado dos veces en una tarde y el botón "Update branch" no sirve, porque `dev` exige PR y rechaza la escritura directa. Esta tarea lo automatiza.

## Alcance y restricciones

- Dentro:
  - `scripts/sync-dev.mjs`: decide si hace falta sincronizar, crea la rama, fusiona `main` en `dev`, comprueba que el árbol resultante es **idéntico** al de `dev`, abre el PR y lo fusiona cuando las tres comprobaciones están en verde.
  - `.github/workflows/sync-dev.yml`: se dispara con cada push a `main`, y también a mano con `workflow_dispatch`.
  - Tests de las decisiones puras (¿hace falta?, nombre de rama, cuerpo del PR) con `node --test`, ejecutados en el job `check`.
  - Documentación en `docs/review-gate.md`.
- Fuera: cambiar la protección de `dev` o de `main`, tocar la guardia de OPS-10, y cualquier automatización que resuelva conflictos: si la fusión choca, o si el árbol no queda idéntico a `dev`, el script aborta con un mensaje claro en vez de forzar una resolución.
- Invariantes:
  - La sincronización **no cambia contenido**: si cambia algo, no se fusiona.
  - Sin secretos en el código: el token vive en `secrets.SYNC_TOKEN`.
  - Si el secreto no existe, el workflow avisa y termina sin fallar, para que un fork o un repo recién clonado no se rompa.

## Superficie de edición (nuestra)

`scripts/sync-dev.mjs`, `scripts/sync-dev.test.mjs`, `.github/workflows/sync-dev.yml`, `.github/workflows/check.yml`, `docs/review-gate.md`, `docs/backlog.md`, `odd/tasks/ops-11-sincronizacion-automatica.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `node --test` para las decisiones puras.
- RED: los tests de las decisiones antes del script.

## Riesgo y review (nuestra)

- Tipo: entrega y CI.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5 (entrega) y elemento 2 (un token con permiso de escritura: debe ser de alcance mínimo y no aparecer nunca en logs). Un error aquí escribe en `dev` sin que nadie mire, así que el script comprueba el árbol antes de abrir el PR y no resuelve conflictos por su cuenta.

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] Tests de las decisiones puras (6 con `node --test`).
- [x] Script de sincronización.
- [x] Workflow con `push` a `main` y `workflow_dispatch`.
- [x] Documentación y notas de seguridad del token.
- [x] `pnpm check` en verde.

## Evidencia y progreso

Rama `lg/ops-11-sincronizacion-automatica`.

- `scripts/sync-dev.mjs`: `necesitaSincronizacion`, `nombreDeRama` y `cuerpoDePr` son puras y se prueban sin git; el CLI hace el trabajo real y falla con un mensaje claro si el árbol no queda idéntico al de `dev` (regla de oro: la sincronización no cambia contenido).
- El nombre de rama (`sync/dev-<main>-<dev>`) es estable para los mismos commits y solo esas ramas las toca el script.
- `.github/workflows/sync-dev.yml`: se dispara con push a `main` y a mano; `concurrency` para que dos entregas seguidas no se pisen; `persist-credentials: false` porque el push lo hace el token del script.
- Los 6 tests se ejecutan también en el job `check`, así que una regresión en la sincronización rompe la build.
- Sin el secreto `SYNC_TOKEN`, el CLI imprime qué hay que configurar y sale con 0: un fork o un repo recién clonado no se rompen.

## Siguiente paso

Crear el secreto `SYNC_TOKEN` (persona) y probar el ciclo completo con la siguiente entrega.

## Cambios de alcance aceptados

1. Se necesita un token propio (`SYNC_TOKEN`) porque los PRs abiertos con el `GITHUB_TOKEN` por defecto no disparan workflows: sin token, el PR de sincronización no tendría comprobaciones y nunca podría fusionarse.
