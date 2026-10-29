# REF-QA-08-04: una sola normalización de texto en el paquete de IA

## Objetivo y motivo

Sale del pase de arquitectura de la ola (`odd/reviews/ola-2.md`, hallazgo 4). La normalización de tildes está tres veces en `packages/ai`, y dos de las copias son idénticas byte a byte:

- `guardrails/tone.ts:41-46` y `guardrails/staleness.ts:52-58` tienen la misma función `normalizar` (NFD, quitar diacríticos, minúsculas), y el comentario de la segunda dice "igual que el tono": la igualdad se mantiene a mano.
- `retrieval/tokenize.ts:29-31` usa un mapa explícito de siete caracteres (`á é í ó ú ü ñ`) antes de filtrar a `[a-z0-9]`.

Coste: si mañana hay que tratar otro carácter, se arregla en un sitio y no en los otros dos, y las comparaciones de tono y de caducidad pueden divergir en silencio. La recuperación BM25 usa una tabla distinta para la misma idea.

## Alcance y restricciones

- Dentro:
  - Una función exportada `normalizarSinTildes` que haga lo que hoy hacen las dos copias idénticas.
  - `tone.ts` y `staleness.ts` la usan y pierden su copia.
  - `tokenize` la usa en lugar del mapa, **solo si** el resultado sobre el corpus y los tests de recuperación es equivalente o mejor.
  - Tests que fijen el comportamiento de la función compartida y el de `tokenize`.
- Fuera:
  - Cambiar el algoritmo de BM25, los pesos o el formato del índice.
  - Cambiar qué se considera palabra vacía.
  - Tocar el esquema de contenido o el corpus.
- Invariantes: todo lo que hoy hace `tone`, `staleness` y `tokenize` sobre el corpus real sigue dando lo mismo, salvo los caracteres que hoy se descartan y que la normalización nueva resolvería mejor; cualquier diferencia de esa clase se mide y se dice.

## Superficie de edición

`packages/ai/src/normalizar.ts`, `packages/ai/src/guardrails/tone.ts`, `packages/ai/src/guardrails/staleness.ts`, `packages/ai/src/retrieval/tokenize.ts`, `packages/ai/src/index.ts`, `packages/ai/test/`, `docs/backlog.md`, `odd/tasks/ref-qa-08-04-normalizar.md`, `odd/reviews/ref-qa-08-04.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` en `packages/ai`, que ya tiene 144 tests, incluidos los de recuperación y los de guardarraíles.
- RED: un test nuevo que exige que `tone`, `staleness` y `tokenize` coincidan sobre el mismo conjunto de textos con tildes, diéresis y eñes, y que hoy falla por la diferencia entre el mapa y NFD en caracteres como `ç` y `à`.

## Riesgo y review (nuestra)

- Tipo: IA (guardarraíles y recuperación).
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 3, porque `tokenize` alimenta el índice que decide qué fuentes ve el modelo: un cambio de tokens cambia las respuestas. Mitigación: los 144 tests del paquete, el test de equivalencia nuevo y la comprobación explícita de que el corpus real indexa igual.

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] RED: test de equivalencia entre las tres normalizaciones.
- [x] `normalizarSinTildes` exportada y usada por `tone` y `staleness`.
- [x] `tokenize` con la función compartida, con el corpus real comparado antes y después.
- [x] `pnpm check` y `pnpm e2e` en verde.
- [x] Review gate con informe en `odd/reviews/ref-qa-08-04.md`: aprobado, sin bloqueantes.
- [ ] Backlog actualizado y PR.

## Evidencia y progreso

- RED: `packages/ai/test/normalizar.test.ts` con sondas de `á é í ó ú ü ñ ç à ö`.
  En rojo, solo fallaba `tokenize`, y en `ç` (y en `à` y `ö`): el mapa la parte
  como separador (`façde` produce `[]` tras el filtro de longitud) mientras la
  normalización NFD de tono y caducidad la resuelve a su base.
- GREEN: `normalizarSinTildes` en `packages/ai/src/normalizar.ts` (NFD, rango
  `\u0300-\u036f`, minúsculas), exportada desde `index.ts`; `tone.ts` y
  `staleness.ts` pierden su copia byte a byte.
- Corpus: comparación mapa congelado contra implementación nueva sobre 24
  fichas de `content/` y 427 literales de los tests de recuperación (451
  textos): 0 diferencias en `tokenize` y en `normalizeText`.
- `normalizeText` también pasa a la función compartida: usaba el mismo mapa y
  dejarlo habría conservado la segunda normalización que este refactor elimina.
- Verificación: 150 tests del paquete (144 previos + 6 nuevos) en verde,
  `pnpm typecheck` en verde, `pnpm check` en verde salvo el fallo conocido de
  estilo en `.atl/skill-registry.md` (directorio de herramientas fuera de git),
  resto de `check` ejecutado y en verde, y `pnpm e2e` completo: 174 pasados,
  2 omitidos.

## Log

- (implementación, rama `lg/ref-qa-08-04-normalizar`)
