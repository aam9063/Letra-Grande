# Review gate AI-03a: recuperación BM25 sobre el contenido verificado

---
tarea: AI-03a
base: 154e5d8
revisado: 42a1dd3
revisor: jd-judge-a (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

La base es sólida. La fórmula BM25 es correcta (IDF variante Lucene, saturación de frecuencia con `k1`, normalización por longitud con `b`), la puntuación se expone y el orden es determinista sin `localeCompare`. El tokenizador normaliza acentos y mayúsculas, conserva siglas cortas como `IRPF`, `IVA`, `DNI` y una consulta sobre `30 días` sigue funcionando aunque pierda el número. Los filtros se comportan como se declaran, ninguna ficha de otra región se cuela y el cargador salta archivos inválidos sin romper. El índice solo lee `content/`: nada del vault, la pregunta del usuario solo se tokeniza como consulta y nunca entra como documento, y no hay ni un `console`. Sin secretos, sin `any`, comentarios en español, sin rayas. `yaml` ya estaba en el workspace a través de `packages/schema`.

## Hallazgos

### 1. [bloqueante] packages/ai/src/retrieval/index.ts:21 y comentario 14-19

Problema: el umbral 0.5 no cumplía su promesa. Con cinco fichas de gas y cinco de IBI, la pregunta "que empresa gestiona el contrato del IBI" devolvía las de gas **primero** con puntuación 1.452 y las de IBI después con 0.663. Un término presente en la mitad del corpus tiene IDF 0.693, por encima del umbral, y dos términos comunes compartidos lo multiplican. Una cita que no respalda la afirmación es peor que `outOfScope`.
Propuesta: gobernar por evidencia y no solo por magnitud. Aplicado: se descartan los términos con frecuencia de documento cero, se exige el **término más raro** de la consulta (menor frecuencia de documento, empate por primera aparición), se exige cobertura de al menos la mitad de los términos y el umbral de puntuación queda como residual y de orden. Si todos los términos tienen frecuencia cero, la lista vuelve vacía. El comentario falso se eliminó y cada constante quedó justificada.

### 2. [recomendado] index.ts:260

Problema: la longitud del documento era el número de términos únicos, así que repetir una palabra penalizaba menos de lo que debe.
Propuesta: sumar frecuencias. Aplicado, con test de que la repetición no gana a un documento corto y enfocado.

### 3. [recomendado] index.ts:154 (canales)

Problema: el texto indexado incluía URLs y correos literales, generando términos basura (`example`, `com`) que producían coincidencias sin relación.
Propuesta: limpiarlos del texto indexado conservándolos en el valor que ve la persona. Aplicado, con test.

### 4. [recomendado] loader.ts y deps.ts

Problema: `skippedFiles` se calculaba y se descartaba. Si todos los YAML fallaran, el asistente respondería `outOfScope` para siempre sin señal.
Propuesta: exponer contadores de diagnóstico sin contenido. Aplicado: el recuperador expone `diagnostics()` con archivos leídos, archivos saltados y documentos indexados, y el proxy conserva la referencia para consultarlo. Sin registro de texto.

### 5. [recomendado] retriever.ts y handler.ts

Problema: las fichas sin verificar se marcaban añadiendo " (sin verificar)" al título. Es un truco de contrato que puede acabar dentro del texto del modelo y contaminar la interfaz.
Propuesta: llevar `verified` como campo. Aplicado: el recuperador lo establece y el catálogo `fuentes` del proxy lo transporta, de modo que la interfaz pueda avisar como corresponda.

### 6. [nota] Filtros sin normalizar

`{ region: "Cataluña" }` no encontraba "cataluna". Aplicado: los filtros normalizan acentos y mayúsculas, con test.

### 7. [nota] Organismos multisectoriales

Solo se indexaba `sectors[0]`. Aplicado: se indexan todos, sin duplicar resultados.

### 8. [nota] Documento de canales con fuente ajena

El documento de canales citaba la fuente del primer canal aunque mezclara varios. Aplicado: un documento por canal, con su propio id de fuente, título y URL, de modo que la cita corresponde al canal preguntado.

### 9. [nota] Tests de semántica declarada

Faltaba cubrir el filtro vacío como "cualquiera" y el caso de la palabra común. Aplicados, más un test que fija el compromiso aceptado de que "1.500 euros" se reduzca a `["500", "euros"]` y por qué se acepta.

### 10. [nota] `findContentRoot` en build independiente

Si `content/` no viaja en el output de un build standalone de Next, el índice queda vacío en silencio. Documentado en el comentario del cargador y en el documento de la tarea.

## Code smells

La protección `(entry.length / index.avgLength || 1)` era críptica: quedó comentada. Sin secretos incrustados en el diff.

## Qué se aplicó en la ronda de correcciones

Los diez hallazgos. Resultado: 95 tests en `packages/ai` y 58 en `apps/web`, `pnpm check` en verde.
