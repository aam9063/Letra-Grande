# Review gate CORE-01: contrato de datos en packages/schema

---
tarea: CORE-01
base: 8d605d4
revisado: fc74dbc
revisor: jd-judge-b (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

La sección 8.8 está cubierta y no es tautológica: cada test comprueba el mensaje del issue, no solo `success === false`. Verificados: plantillas válidas, `verified: true` sin fecha, sin autor o solo con fuentes `tercero`, `sourceId` inexistente, numeración rota, dos avisos, bloque sin citas, `unsupported_figure` con `detail: "14.99"` y `unknown_source` con el id. El caso pendiente del documento está probado de verdad: los claims del test no tienen dígitos, así que si el número de paso contase como cifra aparecerían dos issues y el test fallaría. Separadores de miles y decimales cubiertos. Plantillas ficticias, sin datos personales, sin secretos, sin red, sin rayas. Cero `any`. El validador detecta id duplicado, nombre de archivo incorrecto, escalado a organismo inexistente y aviso de caducidad a 180 días.

## Hallazgos

### 1. [recomendado] packages/schema/src/blocks.ts:91

Problema planteado: la comparación de cifras parecía ser por subcadena, de modo que "30 días" pasaría contra una fuente que dice "300".
Verificación en la ronda de correcciones: la premisa no se cumplía. `haystack` es un arreglo de cifras ya normalizadas, así que `haystack.includes(fig)` es pertenencia exacta y "30" ya no validaba contra "300". Cambiar a regex sobre el texto unido habría debilitado el caso contrario ("3" contra "3,5").
Acción: se fija la semántica con un comentario en el código y se añaden tres tests que la pinchan ("30" contra "300", "500" contra "1.500", y "1.500" contra "1500"). Esfuerzo: S. Aplicado.

### 2. [recomendado] packages/schema/scripts/validate-content.ts:28

Problema: si falta una carpeta de colección, `readdirSync` lanza ENOENT con un stack crudo, sin mensaje útil.
Propuesta: comprobar cada colección y fallar con un mensaje propio. Esfuerzo: S. Aplicado: `existsSync` por colección y error que nombra la carpeta, con separadores de ruta normalizados para que el mensaje sea igual en Windows y en Linux.

### 3. [recomendado] packages/schema/scripts/validate-content.ts (todo el script)

Problema: sin tests automatizados, y es la pieza que gatea el contenido real futuro.
Propuesta: extraer la lógica a una función pura y probarla. Esfuerzo: M. Aplicado: `src/validate-content-core.ts` con `validateContent(root, collections)`, CLI reducida a envoltorio y cinco tests con fixtures en el directorio temporal del sistema (id duplicado, nombre incorrecto, escalado inexistente, caducidad y carpeta ausente).

### 4. [nota] blocks.ts:47-52 y procedure.ts:37-41

Duplican la regla "pasos 1, 2, 3" con mensajes distintos. Aceptable porque son esquemas distintos; si aparece un tercer caso, extraer un helper a `common.ts`.

### 5. [nota] test/helpers.ts:14-19

Casts `as Company`, `asAuthority`, `asProcedure` sin validar. Aceptable en fixtures; no se ejecuta.

### 6. [nota] validate-content.ts:50

Cast de `result.data` a un tipo literal. Forma acotada, conforme a la sección 8.7, sin riesgo real.

## Respuestas explícitas

- Code smells: ninguno bloqueante. `extractFigures` y `normalizeForFigures` están bien factorizadas y exportadas para reuso; `IssueSink` desacopla de zod de forma razonable.
- Secretos hardcodeados: ninguno.

## Qué se aplicó en la ronda de correcciones

- Hallazgo 1: no era un defecto real. Se documenta la semántica exacta y se añaden tres tests de regresión.
- Hallazgo 2: aplicado (`existsSync` con mensaje claro por colección).
- Hallazgo 3: aplicado (lógica extraída a función pura y cinco tests nuevos).
- Hallazgos 4, 5 y 6: no se ejecutan.
