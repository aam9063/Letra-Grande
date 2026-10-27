# Review gate OPS-09: validador de decisiones citadas

---
tarea: OPS-09
base: 7dfa4ef
revisado: e2c5f10
revisor: jd-judge-b (contexto limpio, solo lectura, expresión regular probada a mano)
veredicto: aprobado con cambios
---

## Resumen

El validador hace lo que promete y no tiene el defecto que viene a evitar: probado a mano contra más de treinta cadenas, `MOD-12`, `REF-UI-09`, `D-120`, `MOD-D-12`, `xd-12`, `XD-12`, `_D-12` y `d-12` no cuentan como citas, mientras que `(D-12)`, `"D-12"`, una cita entre comillas invertidas, en negrita, tras un guion, dos seguidas y al inicio del texto sí cuentan. Los bloques cercados también cuentan, que es conservador y deseable: mejor fallar de más que dejar pasar una cita inventada. El paso de CI va antes de `pnpm check` y ejecuta las pruebas del validador, y `pnpm check` lo invoca a su vez. Sin dependencias, sin secretos, español correcto, sin rayas.

## Hallazgos

### 1. [recomendado] scripts/check-decisions.mjs:44

Problema: la lista de documentos era fija y dejaba fuera `docs/ai-guardrails.md`, `ai-provider.md`, `e2e.md`, `review-gate.md` y todo `odd/tasks/`, que **sí** cita decisiones hoy. Un documento nuevo que citara una decisión inexistente habría pasado la CI sin aviso, que es justo el fallo que la tarea viene a evitar. La lista tampoco estaba documentada.
Propuesta: recorrer las carpetas en lugar de enumerar archivos. Aplicado: se escanean `docs/*.md`, `odd/tasks/*.md` y `odd/reviews/*.md`, y el comentario del script lo dice, junto con el motivo de leer el documento de arranque completo y no solo la sección 19.

### 2. [recomendado] scripts/check-decisions.mjs:27

Problema: dos falsos negativos estaban documentados a medias. Un rango `D-11-D-12` solo detecta `D-11`, y una variante `D-12a` cuenta como `D-12`.
Propuesta: fijarlos con tests y dejarlos escritos como comportamiento conocido. Aplicado: tres tests nuevos (el rango, la variante con letra y una cita al inicio del texto).

### 3. [nota] decisionIds lee cualquier tabla del documento de arranque

Un futuro cuadro de propuestas con filas `D-NN` inflaría los identificadores definidos. Hoy es la única tabla con ese formato; queda escrito en el comentario. Si aparece otra, se acota por sección.

### 4. [nota] Cita al inicio del texto

La rama especial para ese caso no tenía test. Aplicado: ahora lo tiene.

## Code smells

`missingDecisions` deduplica dos veces, sin efecto. La lista fija desapareció al recorrer carpetas.

## Secretos

Ninguno.

## Qué se aplicó en la ronda de correcciones

Los dos recomendados y las dos notas. Resultado: ocho tests del validador en verde y el repositorio real pasa la comprobación con trece decisiones definidas.
