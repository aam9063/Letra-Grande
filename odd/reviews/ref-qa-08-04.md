# Review gate REF-QA-08-04: una sola normalización en el paquete de IA

---
tarea: REF-QA-08-04
base: f3a68f3
revisado: f3a68f3
revisor: jd-judge-a
veredicto: aprobado
---

## Resumen

Revisada la unificación de la normalización de texto en `packages/ai`: `normalizarSinTildes` sustituye las dos copias idénticas de `tone` y `staleness` y el mapa de siete caracteres de `tokenize`. **Aprobado sin bloqueantes.** El revisor repitió por su cuenta la comparación que más importaba, reimplementando el `tokenize` antiguo y el nuevo y midiéndolos sobre 869 textos: cero diferencias. También confirmó carácter a carácter que el corpus no contiene nada fuera del set español, que era la condición que hacía segura la sustitución.

## Lo que se comprobó

### La indexación no cambia

El corpus solo tiene `¿ á é í ñ ó ú` como caracteres no ASCII, y todos se resuelven igual con el mapa antiguo y con NFD. El revisor lo midió con dos muestras independientes: los 451 textos del worker y 869 suyos, con cero diferencias en `tokenize` y en `normalizeText`. Mi propia comprobación del inventario coincide.

### La función compartida es la misma que las copias

`normalizarSinTildes` es NFD, rango de diacríticos y minúsculas, en ese orden, idéntico a lo que hacían `tone.ts` y `staleness.ts`. Los guardarraíles no cambian de comportamiento.

### Los tests prueban algo

Sonda a sonda, el revisor confirmó que cada diacrítico se coloca dentro de una frase real (por ejemplo `í` en "cambíado") y que sin la normalización el guardarraíl fallaría: el patrón `hay que` no casaría y la caducidad devolvería una incidencia en vez de cero. En `tokenize`, `façde` daba `[]` con el mapa y da `["fade"]` ahora.

## Notas, sin acción

1. **Orden de operaciones en `tokenize`**: ahora minúsculas van después de NFD, antes iban antes. Divergencia teórica con caracteres cuyo `toLowerCase` produce un combinante (por ejemplo `İ`, U+0130). No está en el corpus y el comportamiento nuevo es mejor.
2. **Los tests son de comportamiento, no de identidad**: se podrían pasar conservando tres copias y ampliando el mapa. El revisor no propone un test de identidad porque sería frágil y de poco valor; el criterio de la tarea era que coincidieran, y coinciden.
3. **Cifras del documento de tarea**: decía "24 fichas" y mencionaba `ü` e `¡` en el corpus. Corregido: son 21 fichas más plantillas y `.gitkeep`, y el corpus no tiene `ü` ni `¡`.
4. **`mock.ts` sigue con su propia normalización**: recorta, colapsa espacios y pasa a minúsculas, sin tocar tildes, para buscar en una tabla exacta. Es otro propósito y no era objeto de la tarea.
5. **Ficheros sueltos** (`DesignUI/`, `test-results/`, imágenes sueltas) siguen sin trackear y no entran en el PR.

## Comprobaciones propias del revisor

- Inventario de caracteres no ASCII de `content/` y de los tests: siete en el corpus, todos en el set; nada fuera.
- Comparación mapa congelado contra la implementación nueva sobre 869 textos: cero diferencias en `tokenize` y en `normalizeText`.
- Diff de `normalizar.ts` contra las copias eliminadas: idéntico.
- Verificación sonda a sonda de `normalizar.test.ts`.
- `grep` de normalizaciones restantes: solo `mock.ts`, con otra responsabilidad.
- `pnpm --filter @letra-grande/ai test`: 150 en verde (144 previos más 6 nuevos).
- Sin rayas largas, medias rayas ni `any`.

## Resultado

Sin ronda de correcciones: no hubo bloqueantes ni recomendados. La única corrección aplicada fue de cifras en el documento de tarea, detectada por el revisor.
