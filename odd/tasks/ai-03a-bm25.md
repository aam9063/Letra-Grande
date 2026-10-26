# AI-03a: recuperación BM25 sobre el contenido verificado

## Objetivo y motivo

El asistente ya valida respuestas contra fuentes, pero hoy el recuperador devuelve vacío y el endpoint responde `outOfScope` siempre. Esta tarea implementa la mitad de servidor de AI-03: un índice léxico BM25 sobre `content/`, con filtros por sector, comunidad y tipo de ficha, y el adaptador que alimenta `retrieveSources` con las fuentes reales. La pantalla de chat es de la sesión de interfaz y no entra aquí.

## Alcance y restricciones

- Dentro: indexación del contenido por ficha y por sección, tokenización en español con normalización de acentos, puntuación BM25, filtros, umbral de relevancia y el adaptador `@letra-grande/ai` que consume `content/` y devuelve `{ id, titulo, url, texto }` para el proxy.
- Fuera: la pantalla de chat (AI-03 UI, otra sesión), las evaluaciones (AI-04), los guardarraíles del prompt (AI-05), los embeddings (solo si AI-04 demuestra mejora, y nunca sobre datos del usuario), y cualquier uso de texto del usuario como fuente.
- Invariantes del proyecto que aplican: al modelo solo llegan fragmentos recuperados de contenido público, cada uno con su `sourceId`; el índice no contiene datos de usuario; sin dependencias nuevas; sin red en los tests.

## Superficie de edición (nuestra)

`packages/ai/src/**`, `packages/ai/test/**`, `apps/web/src/app/api/assistant/deps.ts`, `apps/web/package.json`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest`.
- Fuente de la decisión: `AGENTS.md`.
- RED: primero los casos de ranking, normalización y filtros contra fichas de prueba, viendo fallar el módulo inexistente.

## Riesgo y review (nuestra)

- Tipo: recuperación y contrato del asistente.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 6 (un recuperador que devuelve fuentes irrelevantes produce respuestas mal citadas sin que nadie lo note) y elemento 3 (el contrato `retrieveSources` es el que usa el proxy). Review centrada en: que el ranking sea explicable, que los filtros no dejen pasar fichas de otra comunidad, que ninguna ficha `verified: false` se presente como fuente fiable sin decirlo, y que una consulta sin coincidencias devuelva vacío en lugar de la ficha menos mala.

## Tareas

- [x] Tokenizador español: minúsculas, sin acentos, sin signos, palabras vacías y sin números sueltos.
- [x] `buildIndex(fichas)`: documentos por ficha y por sección, con `sourceId`, título, URL, sector, región, tipo y texto.
- [x] `search(query, filtros)`: BM25 con `k1` y `b` documentados, filtros por sector, región y tipo, y umbral mínimo de puntuación.
- [x] Adaptador que lee `content/`, construye el índice una vez y responde `retrieveSources`.
- [x] Cableado en `deps.ts` del proxy, sustituyendo el recuperador vacío.
- [ ] Tests: ranking, acentos y mayúsculas, filtros, consulta vacía, sin coincidencias y propagación de título y URL para la cita.
- [ ] `pnpm check` y `pnpm e2e` en verde.

## Evidencia y progreso

Pendiente de rellenar por quien implementa.

## Siguiente paso

Desbloquea AI-05 (guardarraíles sobre respuestas reales) y da a la sesión de interfaz un endpoint que responde con contenido real.

## Cambios de alcance aceptados

1. El índice se construye en memoria al arrancar el servidor leyendo `content/`, no como JSON generado en build. Es la vía más simple que mantiene el contenido como única fuente de verdad; si el tiempo de arranque molesta, se pasa a índice pregenerado como refactor registrado.
