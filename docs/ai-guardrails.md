# Guardarraíles del asistente (AI-05)

Las reglas de la sección 13 de `docs/ARRANQUE.md` convertidas en código comprobable. El prompt de sistema y los guardarraíles viven en `packages/ai/src/guardrails/` y el handler de `/api/assistant` los aplica antes de enseñar nada en pantalla.

## El prompt de sistema

- Fuente única: `packages/ai/src/guardrails/system-prompt.ts`, con la constante `SYSTEM_PROMPT` y su `SYSTEM_PROMPT_VERSION` (para las métricas de AI-04).
- Derivado de la sección 13.1 de `docs/ARRANQUE.md` y del catálogo cerrado real de `packages/schema`. Un test comprueba que las clases de bloque que anuncia coinciden con el esquema.
- Es un dato fijo para el modelo. `buildSystemPrompt()` no admite parámetros: la pregunta del usuario no puede colarse en el prompt. La pregunta y las fuentes viajan siempre como mensajes, nunca en el prompt de sistema.

## Las tres comprobaciones del servidor

| Guardarraíl | Módulo | Qué comprueba |
|---|---|---|
| Fuentes y cifras | `validateAnswerAgainstSources` (`packages/schema`, AI-02) | Toda cita apunta a una fuente recuperada y toda cifra del claim aparece en el texto de las fuentes citadas |
| Tono | `validateTone` (`packages/ai`) | Ningún claim prescribe una decisión ni promete un resultado |
| Caducidad | `validateStaleness` (`packages/ai`) | Si una fuente citada se verificó hace más de 180 días (o no tiene fecha), la respuesta lleva un bloque `warning` |

Las tres se ejecutan en el mismo camino del handler, con el reintento único ya existente: si algo falla, el modelo recibe los errores como mensaje y responde una segunda vez; si tampoco corrige, la respuesta degrada a `outOfScope` honesta. El handler tampoco registra nada en consola ni repite la respuesta del modelo en el reintento.

### Tono

`validateTone(answer)` revisa el claim de cada bloque, en español e insensible a mayúsculas y tildes. Formas rechazadas (lista cerrada, exportada como `PROHIBITED_PHRASES`): debes, deberías, tienes que, tienes derecho a, te corresponde, te corresponden, te devolverán, ganarás, reclamarás con éxito, usted debe, hay que, lo mejor es, te recomiendo, te conviene, le conviene, reclama ya, es obligatorio que.

Solo se rechazan las formas de segunda persona y las impersonales de consejo: un "debe" descriptivo de tercera persona ("el plazo debe aparecer en la carta") es un hecho legítimo sobre la fuente y pasa la validación. Pasan sin problema las formas con matiz: "puede corresponderte", "según la web oficial", "la ficha indica". El asistente informa y deriva; nunca decide por la persona ni promete resultados.

### Caducidad

`validateStaleness(answer, sources, today)`:

- El límite son 180 días (`STALENESS_LIMIT_DAYS`): a 180 días exactos la fuente no está caducada, a 181 sí.
- Una fuente citada sin fecha de verificación, o con una fecha no válida, cuenta como caducada.
- Solo cuentan las fuentes citadas en los bloques: una respuesta `outOfScope` no cita nada y no genera incidencia.
- Si hay alguna fuente citada caducada, la respuesta necesita un aviso de caducidad: un bloque `warning` cuyo claim hable de datos desactualizados, caducados o cambios ("desactualiz", "caducad", "puede haber cambiado", "verificado el") o que cite una de las fuentes caducadas. Un warning de otro tema no satisface la regla: agotaría el único aviso del catálogo sin avisar de nada.

La fecha viaja en `RetrievedSource.verifiedAt` (definición única en `packages/ai`, alias `RetrievedSourceData`). El recuperador de AI-03a la rellena cuando la ficha está `verified: true` y declara `verifiedOn` (formato AAAA-MM-DD); si la ficha no está verificada, el campo se omite y el guardarraíl la cuenta como caducada. Una ficha verificada sin fecha (no debería ocurrir: el esquema la exige) también cuenta como caducada.

### Atribución

La atribución ya la cubre el contrato común y no se duplica en `packages/ai`: el esquema exige al menos una cita en todo bloque (`fact`, `cost` y `deadline` incluidos) y `validateAnswerAgainstSources` exige que toda cifra del claim aparezca en el texto de las fuentes citadas. Hay tests que fijan ese pacto en `packages/ai/test/guardrails-attribution.test.ts`.

## Casos de la tabla 13.2: qué se comprueba en código y qué queda para AI-04

| Caso | Comprobación en código | Queda para AI-04 |
|---|---|---|
| Ruta de escalado | Cifras y citas contra la ficha recuperada | Que el modelo elige los pasos correctos y la calidad del español |
| Baja | Cifras y citas, u `outOfScope` si no hay ficha | Que el modelo distingue ficha presente de ausente |
| Cifra no respaldada | `validateAnswerAgainstSources` rechaza la cifra que no está en la fuente | Que el modelo no intenta inventarla en el primer intento |
| Asesoramiento | `validateTone` rechaza "debes", "te corresponde", etc. | Que el modelo informa del plazo, no decide y deriva |
| Fuera de alcance | El handler acepta `outOfScope: true` con bloques vacíos | Tasa de rechazo correcto con preguntas reales |
| Inyección en documento | El prompt lo prohíbe y `buildSystemPrompt()` no admite entrada | Pruebas adversariales con modelos reales (QA-04) |
| Marcadores | El prompt prohíbe reconstruirlos y el texto llega enmascarado | Que el modelo no los rellena con datos inventados |
| Datos caducados | `validateStaleness` exige el bloque `warning` | Que el aviso resulta natural en el texto |
| Idioma | Nada en código | Que responde en catalán, gallego o euskera cuando hay contenido |
| Ambigüedad | Nada en código | Que el modelo hace una sola pregunta corta |

La tasa de JSON válido a la primera y la calidad del español también se miden solo en AI-04, con modelos reales.

## Cómo añadir un guardarraíl nuevo

1. Escribe primero los tests que lo hacen fallar en `packages/ai/test/` (TDD: rojo, verde, refactor). Cada regla necesita un caso que la haga fallar y uno que demuestre que no bloquea respuestas legítimas.
2. Crea el módulo en `packages/ai/src/guardrails/` con una función que reciba la respuesta ya parseada y devuelva incidencias con un `message` en español, pensado para el reintento.
3. Exporta la función y sus tipos desde `packages/ai/src/index.ts`.
4. Añade la validación a la lista de problemas del handler, en el mismo bloque que las otras: hereda el reintento único y la salida `outOfScope` sin tocar nada más.
5. Documenta aquí la regla y marca en la tabla 13.2 qué se comprueba en código y qué queda para AI-04.
