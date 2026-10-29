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

## El conjunto de evaluaciones (AI-04)

`pnpm evals` recorre los 40 casos (cuatro por cada categoría de la sección 13.2), obtiene la respuesta del proveedor que toque y aplica el mismo camino que el proxy: recuperación sobre `content/`, catálogo cerrado, los tres guardarraíles y el reintento único con salida `outOfScope` honesta. Sobre ese camino calcula las seis métricas de la sección 13.2.

- **Dato y código separados:** los casos están en `packages/ai/evals/cases.yaml` y los umbrales en `packages/ai/evals/thresholds.json`, ambos versionados. El código está en `packages/ai/src/evals/`. Los casos usan fichas reales de `content/` (el ejecutor lo comprueba al arrancar) y datos personales ficticios.
- **Qué mide cada métrica:** las métricas 1, 2, 4 y 6 miden la primera respuesta del modelo que encaja en el catálogo, aunque los guardarraíles la degraden después (medir solo la salida degradada escondería los fallos del modelo). La métrica 3 mide el rechazo del modelo en las preguntas fuera de alcance y la 5 el JSON válido al primer intento. La calidad del español (métrica 6) se operacionaliza con el guardarraíl de tono.
- **Casos que aceptan `outOfScope`:** en la categoría Ambigüedad, la aclaración necesita citar algo y puede que no haya contenido: se acepta también la salida honesta `outOfScope` como forma de decir que no hay contenido. En la categoría Idioma, con el corpus actual (solo español) el comportamiento esperado es el rechazo; se revisará si `content/` añade fichas cooficiales.
- **Proveedores:** `AI_PROVIDER` elige el proveedor (mock por defecto). Con mock, las respuestas son las de cada caso (`mockAnswer`): la ejecución valida el camino completo (recuperación, guardarraíles y métricas), no la calidad del modelo. Contra el proveedor real (`nan`) se necesita `NAN_API_KEY`, y correrlo así sigue bloqueado por H-03 y H-08 (condiciones del proveedor sin confirmar): no se finge que se mide lo que no se mide.
- **Umbrales y fallo:** si alguna métrica queda por debajo de su umbral, `pnpm evals` sale con código distinto de cero y nombra la métrica y los casos que fallan. Los umbrales se fijaron con la primera medición real y su fichero lleva la anotación de dónde sale cada uno: ninguna cifra de umbral está inventada.
- **Caso de control:** `pnpm evals --selfcheck` ejecuta el conjunto contra un proveedor que inventa (cita fuentes inexistentes, cifra importes que no están en ninguna fuente, promete resultados y emite un documento con forma de DNI). Si las métricas no lo detectan, el comando sale con error: unas evaluaciones que dan verde sin medir son peores que no tenerlas.
- **CI:** el job `evals` de `.github/workflows/evals.yml` corre cada noche (`schedule`) y se puede lanzar a mano (`workflow_dispatch`). Con el proveedor `mock` por defecto; correrlo contra `nan` necesita el secreto `NAN_API_KEY` y H-03 y H-08 siguen abiertas.
- **Tests del propio ejecutor:** en `packages/ai/test/evals-runner.test.ts`, con un proveedor falso controlado: cita inválida, cifra no respaldada, rechazo incorrecto y datos personales en la salida tienen que bajar la métrica correspondiente. El ejecutor también tiene que saber suspender.

## Cómo añadir un guardarraíl nuevo

1. Escribe primero los tests que lo hacen fallar en `packages/ai/test/` (TDD: rojo, verde, refactor). Cada regla necesita un caso que la haga fallar y uno que demuestre que no bloquea respuestas legítimas.
2. Crea el módulo en `packages/ai/src/guardrails/` con una función que reciba la respuesta ya parseada y devuelva incidencias con un `message` en español, pensado para el reintento.
3. Exporta la función y sus tipos desde `packages/ai/src/index.ts`.
4. Añade la validación a la lista de problemas del handler, en el mismo bloque que las otras: hereda el reintento único y la salida `outOfScope` sin tocar nada más.
5. Documenta aquí la regla y marca en la tabla 13.2 qué se comprueba en código y qué queda para AI-04.
