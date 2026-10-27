# OPS-09: validador de decisiones citadas

## Objetivo y motivo

En esta misma sesión, tres veces seguidas, un script dio por hecha una inserción porque buscaba la cadena `"D-12"` en un documento donde ya existía dentro de `MOD-12`. Dos veces lo cazó el review gate y una se coló hasta el merge. Esta tarea convierte la clase de error en una comprobación automática: si un documento cita una decisión que no está en la tabla, la CI falla.

## Alcance y restricciones

- Dentro: `scripts/check-decisions.mjs` con funciones puras y sus pruebas, un script en `package.json` que entra en `pnpm check`, y el paso en el job de CI.
- Fuera: validar el contenido de las decisiones o su redacción.
- Invariantes: sin dependencias nuevas; solo lee archivos del repositorio.

## Superficie de edición (nuestra)

`scripts/check-decisions.mjs`, `scripts/check-decisions.test.mjs`, `package.json`, `.github/workflows/check.yml`, `odd/tasks/ops-09-validador-decisiones.md`.

## Modo TDD (nuestra)

- Activo: sí, con `node --test`.
- RED: los cinco casos se escriben antes de la implementación; el de `MOD-12` falla con una expresión regular ingenua.

## Riesgo y review (nuestra)

- Tipo: CI y documentación.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 6. Un validador con falsos positivos bloquearía PRs legítimos por citar una decisión dentro de otro identificador, que es justo el error que viene a evitar.

## Tareas

- [x] `decisionIds` y `citedDecisions` como funciones puras.
- [x] `missingDecisions` y el CLI que recorre los documentos.
- [x] Cinco pruebas, incluida la de `MOD-12` y `REF-UI-09`.
- [x] Script en `pnpm check` y paso con las pruebas del validador en CI.
- [x] Verificado contra el repositorio real.

## Evidencia y progreso

- `node --test scripts/check-decisions.test.mjs`: 5 de 5.
- `node scripts/check-decisions.mjs`: `Decisiones OK: 13 definidas y todas las citas resuelven.`
- La expresión regular exige que no haya letra, dígito, guion ni guion bajo antes de `D-NN`, que es lo que distingue una cita de un identificador como `MOD-12`.

## Siguiente paso

Ninguno: queda en la CI.

## Cambios de alcance aceptados

Ninguno.
