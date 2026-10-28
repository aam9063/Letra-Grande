# OPS-13: `pnpm check` ejecuta los tests de los scripts

## Objetivo y motivo

Los tests de los scripts de CI (`check-decisions`, `check-review-report`, `check-main-history`, `sync-dev`) solo se ejecutaban en el workflow. Quien trabaja en local y ejecuta `pnpm check` no los ve, así que una regresión en las guardias de entrega aparece por primera vez en GitHub. Se vio en esta misma sesión: hubo que lanzar `node --test` a mano después de cada cambio.

## Alcance y restricciones

- Dentro: un script `test:scripts` que corre `node --test scripts/*.test.mjs`, dentro de `check`, y quitar del workflow los pasos que ahora serían duplicados.
- Fuera: cambiar los checks requeridos de `dev` y `main`, y tocar los tests de los paquetes.
- Invariantes: lo mismo en local y en CI; ninguna comprobación se pierde por el camino.

## Superficie de edición (nuestra)

`package.json`, `.github/workflows/check.yml`, `docs/review-gate.md`, `docs/backlog.md`, `odd/tasks/ops-13-check-scripts.md`.

## Modo TDD (nuestra)

- No aplica: es la ejecución de tests que ya existen (48 entre los cuatro ficheros). La comprobación es que `pnpm check` los ejecute y falle si alguno falla.

## Riesgo y review (nuestra)

- Tipo: entrega y CI.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5 (si el script nuevo no encuentra los ficheros, el check daría verde sin probar nada).

## Tareas

- [x] `test:scripts` en `package.json` y dentro de `check`.
- [x] Quitar del workflow los pasos duplicados, dejando la comprobación de historia.
- [x] Documentación y backlog.
- [x] `pnpm check` en verde con los 48 tests.

## Evidencia y progreso

- `node --test scripts/*.test.mjs`: 48 tests en verde.
- Los ficheros van **listados uno a uno**, no con un globo: se comprobó que `node --test` con un globo sin coincidencias sale con 0 tests y código 0, así que un renombrado dejaría el check en verde sin probar nada. Con la lista, un fichero que falte hace fallar la ejecución.

## Siguiente paso

Nada: queda cerrado.
