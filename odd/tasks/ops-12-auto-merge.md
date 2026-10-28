# OPS-12: el auto-merge sustituye a esperar las comprobaciones

## Objetivo y motivo

OPS-11 hacía que el workflow de sincronización esperara las comprobaciones con `gh pr checks --watch`. Al crear el token apareció un muro: los tokens fine-grained **no ofrecen permiso sobre la API de comprobaciones**, así que el paso no puede funcionar. En vez de pedir un permiso imposible, se le pide a GitHub que fusione cuando esté en verde.

## Alcance y restricciones

- Dentro: activar **Allow auto-merge** en el repositorio (ajuste, no código), armar el auto-merge en el script, y quitar la espera y el permiso que ya no hacen falta.
- Fuera: cambiar la protección de `dev` o de `main`, y cualquier fusión que no pase por las tres comprobaciones.
- Invariantes:
  - Solo se cae al merge directo si el motivo es que el auto-merge no está disponible; cualquier otro error se ve tal cual y la ejecución termina en rojo.
  - La protección de `dev` sigue siendo la que impide fusionar con comprobaciones rojas.

## Superficie de edición (nuestra)

`scripts/sync-dev.mjs`, `scripts/sync-dev.test.mjs`, `.github/workflows/sync-dev.yml`, `docs/review-gate.md`, `docs/backlog.md`, `odd/tasks/ops-12-auto-merge.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `node --test`, con la decisión nueva aislada (`esAutoMergeNoDisponible`).

## Riesgo y review (nuestra)

- Tipo: entrega y CI.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5 (entrega): ahora fusiona GitHub en lugar del script.

## Tareas

- [x] Documento de funcionalidad.
- [x] Decisión aislada y probada.
- [x] Auto-merge en el repositorio y en el script.
- [x] Documentación del prerrequisito.
- [x] `pnpm check` en verde y 13 tests del script en verde.

## Evidencia y progreso

Rama `lg/ops-12-auto-merge`.

- `allow_auto_merge` activado en el repositorio (comprobado por API).
- El script arma el auto-merge; si el motivo del fallo no es la falta de auto-merge, imprime el error y termina en rojo.
- El token necesita solo Contents y Pull requests, lectura y escritura.
- El timeout del workflow baja de 30 a 15 minutos: ya no hay espera.

## Siguiente paso

Probar el ciclo completo con una entrega real.

## Cambios de alcance aceptados

1. Se activa un ajuste del repositorio (auto-merge) como parte de esta tarea: sin él, el workflow no puede dejar el PR listo para fusionarse solo.
