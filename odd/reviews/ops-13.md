---
tarea: OPS-13
base: 7c64a14
revisado: a889c965bc2bcc9ed73d08b54a3919315c713b3c
revisor: jd-judge-b
veredicto: aprobada con matices
---

# Review OPS-13: `pnpm check` ejecuta los tests de los scripts

Revisión solo lectura de `git diff 7c64a14..HEAD` (un commit, 5 ficheros, +49/-10).

## Qué comprobé

1. **Expansión del globo y verde vacío.** En CI (ubuntu-latest, bash) el patrón
   `scripts/*.test.mjs` se expande y hoy encuentra los 4 ficheros: 48 tests en
   verde, exit 0 (comprobado en local con Node v24.22.1). Pero la afirmación del
   documento de tarea es falsa: `node --test` con un globo que no encuentra
   ficheros **sale en verde**, no falla. Verificado: `node --test 'scripts/zzz-*.test.mjs'`
   da `tests 0`, `exit 0`. Con una ruta literal inexistente sí falla
   (`Could not find`, exit 1), así que una lista explícita de ficheros sí
   protegería. El riesgo declarado en la tarea (elemento 5, "verde sin probar
   nada") sigue abierto, solo que latente.
2. **Comprobaciones del workflow.** No se pierde nada. El job `check` quita los
   tres pasos de tests y `pnpm check` los recoge vía `test:scripts`
   (check-decisions, check-main-history, sync-dev). El test de
   `check-review-report` no estaba en ese job: sigue en el job `review-report`,
   que es el único que puede ejecutarlo (hace checkout del head sha sin
   `pnpm install`). Todas las comprobaciones reales siguen: style,
   decisions:check, typecheck, test, content:validate, check-main-history,
   build, build:desktop, exportación de escritorio, e2e y review-report.
3. **package.json.** El cambio funcional es correcto y mínimo (`test:scripts`
   y su sitio en `check`). Pega: se reformateó `engines` de tres líneas a una,
   un cambio sin relación con la tarea. No hay prettier en el repo que lo
   justifique; `.editorconfig` no lo pide.
4. **Documentación y tarea.** Backlog y `docs/review-gate.md` son coherentes con
   lo implementado. El documento de tarea declara 48 tests (correcto) pero
   afirma en "Evidencia" que `node --test` falla si no encuentra ficheros:
   es exactamente al revés, y era el riesgo que la tarea decía tener cubierto.

## Hallazgos

| Id | Gravedad | Dónde | Resumen |
|----|----------|-------|---------|
| JD-B-001 | WARNING | package.json:8 (`test:scripts`), odd/tasks/ops-13-check-scripts.md:38 | `node --test` con un globo sin coincidencias sale en verde (0 tests, exit 0). Si alguien renombra o mueve los tests, `pnpm check` vuelve a pasar sin probar nada, que es justo la regresión que OPS-13 quiere que se vea en local. Además la tarea documenta lo contrario. Corrección barata: lista explícita de los cuatro ficheros o una guardia que falle con 0 tests. |
| JD-B-002 | SUGGESTION | package.json:8 | Reformato de `engines` sin relación con la tarea: ruido de diff en un PR de proceso. |

## Veredicto

**Aprobada con matices.** El cambio hace lo que promete, no pierde ninguna
comprobación de CI y está bien documentado en backlog y review-gate. No es
bloqueante porque hoy el globo encuentra los ficheros y los 48 tests corren en
local y CI. Queda pendiente barata: eliminar la vía de "verde vacío"
(JD-B-001) y revertir el reformato de `engines` (JD-B-002).


## Qué se aplicó en la ronda de correcciones

- JD-B-001 (warning), aplicado: el globo `scripts/*.test.mjs` sale con 0 tests y código 0 si no encuentra nada, así que un renombrado habría dejado `pnpm check` en verde sin probar. Ahora los cuatro ficheros van listados uno a uno: si falta alguno, la ejecución falla. La Evidencia de la tarea decía lo contrario y se corrigió.
- JD-B-002 (sugerencia), aplicado: se revierte el reformateo de `engines` que era ruido de diff.
