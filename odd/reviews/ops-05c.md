# Review gate OPS-05c: el gate deja de dar falsos rojos

---
tarea: OPS-05c
base: 75053a4
revisado: f2b1c04
revisor: jd-judge-b (contexto limpio, solo lectura)
veredicto: aprobado
---

## Resumen

El gate sigue siendo exigible por todas las rutas de PR. Revisados los seis caminos que pueden acabar en un merge: PR abierto directamente no borrador (`opened`), borrador marcado listo (`ready_for_review`), push posterior a estar listo (`synchronize`), PR reabierto (`reopened`), título editado después de estar listo (`edited`) y el ciclo borrador, listo, borrador, listo. En todos, `draft == false` y el job se ejecuta. En borrador el job se salta, y GitHub no permite fusionar un borrador: no hay hueco. La guarda `github.event_name == 'pull_request'` protege el `push` a `dev`, donde el payload no tiene `pull_request` y la expresión daría nulo. El script `check-review-report.mjs` no se toca en este diff: se ejecutaron sus tests y se comprobó que el informe inexistente y el veredicto `rechazado` siguen fallando con la ruta exacta. La documentación nueva describe lo que el workflow hace de verdad. Paridad local confirmada: el script se puede ejecutar a mano antes de abrir el PR.

## Hallazgos

### 1. [nota] .github/workflows/check.yml:54-56

Problema: el gate por PR asume que `dev` solo recibe merges de PR. Un push directo a `dev` nunca ejecuta el job, porque el `if` lo excluye.
Propuesta: no tocar el workflow; confirmar en la configuración del repositorio que `dev` exige PR y que `review-report` es una comprobación requerida. Es la tarea humana H-10, todavía abierta.

### 2. [nota] .github/workflows/check.yml:55-56

Problema: el comentario nuevo estaba escrito sin tildes.
Propuesta: corregirlo. Aplicado.

### 3. [nota] docs/review-gate.md, limitaciones

Un PR cuyo título no lleva id de tarea se salta el gate por diseño del script. Está documentado y es anterior a esta tarea.

## Code smells

Ninguno en el diff. El doble respaldo `PR_TITLE` y `GITHUB_PR_TITLE` del script es anterior y no se toca. Sin secretos, sin dependencias nuevas, YAML válido, sin rayas largas.

## Qué se aplicó en la ronda de correcciones

La nota 2, el comentario del workflow con tildes. La nota 1 queda como acción humana en H-10 y la 3 como limitación ya documentada.

## Nota de proceso

Este PR se abrió como borrador para probar el cambio sobre sí mismo: con el PR en borrador, `check` y `e2e` corrieron en verde y `review-report` apareció como omitido, no como fallo. Al marcarlo listo con este informe commiteado, el job se ejecuta por primera vez y pasa.
