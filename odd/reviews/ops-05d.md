# Review gate OPS-05d: informe con id completo o base

---
tarea: OPS-05d
base: 779d0f5
revisado: 3c2a7e1
revisor: jd-judge-b (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

La relajación del nombre está bien acotada: se acepta el id completo y, cuando el título lleva una letra final, también el id base, con el id completo primero. El mensaje de fallo nombra las dos rutas posibles. El patrón de id sigue rechazando un título sin id y sigue detectando ids en medio de una frase en minúsculas o mixtas. Sin dependencias nuevas, español correcto, sin rayas, sin secretos. La revisión encontró dos defectos reales y dos huecos de prueba, todos corregidos.

## Hallazgos

### 1. [bloqueante] docs/review-gate.md:129

Problema: el documento de tarea prometía una línea en `docs/review-gate.md` y la marcaba como hecha, pero el archivo no se había tocado y seguía diciendo que el gate exige `odd/reviews/<id>.md`, ya inexacto.
Propuesta: añadir la línea. Aplicado: el documento explica los dos nombres aceptados, que el error nombra ambos y la comprobación del campo `tarea:`.

### 2. [recomendado] scripts/check-review-report.mjs:73

Problema: la extracción del nombre partía solo por barras normales, así que en Windows el mensaje de éxito mostraba la ruta absoluta completa.
Propuesta: usar `basename`. Aplicado.

### 3. [recomendado] scripts/check-review-report.mjs:24

Problema: falso positivo real. Un título `AI-03a` con el informe viejo `ai-03.md`, de la tarea AI-03 ya fusionada, pasaba en verde; lo mismo `OPS-04b` con `ops-04.md`. La relajación del nombre abría la puerta a que el informe equivocado bastara.
Propuesta: comparar el campo `tarea:` del front matter con el id del título, completo o su base. Aplicado: si no coincide, el gate falla y dice de qué tarea es el informe y cuál reclama el pull request.

### 4. [nota] scripts/check-review-report.test.mjs

Problema: los tres tests nuevos no atrapaban un cambio de orden, porque con un solo archivo en el directorio el orden no cambia el resultado.
Propuesta: un caso con los dos informes y veredictos distintos. Aplicado: con `ai-03a.md` aprobado y `ai-03.md` rechazado gana el del id completo.

### 5. [nota] scripts/check-review-report.test.mjs

Problema: los tests nuevos no limpiaban el directorio temporal si fallaba una aserción.
Propuesta: el mismo patrón `try/finally` que los anteriores. Aplicado.

## Code smells

`candidateNames` quita solo una letra final, coherente con el patrón de un sufijo único. La pareja `expectedPaths` y `expectedPath` es aceptable. Sin secretos incrustados.

## Qué se aplicó en la ronda de correcciones

Los cinco hallazgos. Resultado: 17 tests del gate en verde y el comando real resolviendo correctamente el informe por el id base. Se documentó además por qué el run de "listo" puede no ver el informe cuando GitHub construye el merge ref con retraso, y se registró `REF-OPS-05e` para que el job haga checkout del commit de la rama.
