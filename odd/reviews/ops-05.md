# Review gate OPS-05: review gate exigible en CI

---
tarea: OPS-05
base: 543f15a
revisado: 3df7cbf
revisor: jd-judge-b (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

El gate funciona en los casos principales: falta de informe, front matter incompleto, veredicto inválido y títulos con el id en medio fallan con salida 1 y un mensaje accionable; un informe completo pasa; un título sin id se salta; rutas en otra caja, carpeta inexistente y ejecución desde otro directorio se comportan bien. La revisión encontró dos formas de pasar en falso y que los tests del propio gate no se ejecutaban en ninguna parte.

## Hallazgos

### 1. [bloqueante] scripts/check-review-report.mjs:12

Problema: el patrón distinguía mayúsculas, así que un título `ops-05: ...` no encontraba id y la comprobación pasaba: una errata bastaba para saltarse el gate.
Propuesta: patrón insensible a mayúsculas y normalización con `toUpperCase()` antes de buscar el informe. Aplicado, con tests de `ops-05`, `core-01`, `CORE-01` y un id en medio de un título más largo.

### 2. [bloqueante] scripts/check-review-report.test.mjs y .github/workflows/check.yml

Problema: las ocho pruebas pasaban en local, pero no había ningún `node --test` en la CI: una regresión debilitando el patrón no habría roto nada.
Propuesta: ejecutar los tests dentro del job `review-report`. Aplicado, antes de la comprobación del informe.

### 3. [recomendado] .github/workflows/check.yml:2

Problema: `pull_request` sin `types`, así que renombrar el título después de un run verde no lo relanzaba.
Propuesta: añadir `edited` (con `opened`, `synchronize` y `reopened`). Aplicado.

### 4. [recomendado] scripts/check-review-report.mjs:11

Problema: un informe con `veredicto: rechazado` hacía pasar la CI.
Propuesta: fallar con `rechazado`, que es lo que corresponde a un gate de entrega. Aplicado, con test.

### 5. [nota] scripts/check-review-report.mjs:15

Limitaciones conocidas y aceptadas para la primera versión: con dos ids en el título solo se comprueba el primero, y un id reutilizado pasaría con un informe antiguo porque el `base` y el `revisado` del front matter no se comparan con el diff del PR. Documentadas en `docs/review-gate.md`.

### 6. [nota] .github/PULL_REQUEST_TEMPLATE.md:11

Problema: la línea de riesgo está en inglés en un proyecto en español.
Propuesta: fijar por escrito que `Risk: item N` y `Risk: none` son una convención literal, legible por máquina, y que no se traduce. Aplicado en la plantilla y en `docs/review-gate.md`.

## Qué se aplicó en la ronda de correcciones

Los seis hallazgos. El gate ahora no se salta con una errata de caja, no aprueba un veredicto `rechazado`, relanza al editar el título y ejecuta sus propios tests en cada PR. Doce tests en verde y los tres casos reales verificados: id sin informe (salida 1), id con informe (salida 0) y sin id (salida 0, no aplica).
