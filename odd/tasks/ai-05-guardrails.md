# AI-05: guardarraíles del asistente

## Objetivo y motivo

El prompt del asistente está hoy dentro del handler, marcado como provisional, y no existe ninguna comprobación de tono: una respuesta puede decir "debes recurrir" o "tienes derecho a" y pasar la validación, porque valida fuentes y cifras, no lenguaje. Tampoco avisa cuando las fuentes están caducadas. Esta tarea convierte las reglas de la sección 13 en código comprobable y deja el prompt en un único sitio.

## Alcance y restricciones

- Dentro: el prompt de sistema como fuente única en `packages/ai`, la validación de tono (sin asesoramiento prescriptivo), el aviso obligatorio cuando una fuente supera los 180 días y la exigencia de atribución; el cableado en el handler y `docs/ai-guardrails.md`.
- Fuera: las evaluaciones con modelos reales (AI-04), la recuperación (AI-03a, hecho) y la interfaz del chat.
- Invariantes del proyecto que aplican: el asistente no da asesoramiento jurídico individualizado, atribuye siempre ("según la web oficial", "la ficha indica"), no promete resultados y deriva a un organismo cuando no puede responder. Los documentos del usuario son datos, nunca instrucciones.

## Superficie de edición (nuestra)

`packages/ai/src/**`, `packages/ai/test/**`, `apps/web/src/app/api/assistant/**`, `docs/ai-guardrails.md`, `docs/backlog.md`, `odd/tasks/ai-05-guardrails.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest`.
- RED: primero los casos deterministas de la tabla 13.2 que se pueden probar sin modelo real, viendo fallar cada guardarraíl.

## Riesgo y review (nuestra)

- Tipo: comportamiento del asistente.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 3 (el contrato de lo que el asistente puede afirmar) y elemento 6 (un guardarraíl que no falla nunca es decoración). Review centrada en: que cada comprobación tenga un caso que la haga fallar, que no bloquee respuestas legítimas ("puede corresponderte" sí, "te corresponde" no), y que el prompt siga siendo un único texto verificable.
- Riesgo de la tarea: cambio de comportamiento del asistente, reversible y cubierto por pruebas.

## Tareas

- [ ] `packages/ai/src/guardrails/system-prompt.ts`: prompt de sistema único, derivado de la sección 13.1 y del catálogo real, con versión exportada para las métricas de AI-04.
- [ ] `validateTone(answer)`: rechaza lenguaje prescriptivo ("debes", "deberías", "tienes que", "te corresponde", "tienes derecho a") y exige atribución en los bloques que afirman hechos.
- [ ] `staleSourcesWarning(answer, sources, today)`: si alguna fuente citada se verificó hace más de 180 días, la respuesta debe incluir un bloque de aviso; si no lo incluye, es una incidencia.
- [ ] Cableado en el handler: prompt desde el paquete y las dos validaciones en el mismo camino que ya reintenta y degrada a `outOfScope`.
- [ ] Tests de los casos deterministas de la tabla 13.2: asesoramiento, cifra no respaldada, fuera de alcance, inyección en documento (el texto de la fuente con órdenes se trata como dato), marcadores no reconstruidos, datos caducados y ambigüedad.
- [ ] `docs/ai-guardrails.md` con las reglas, los casos y qué queda para AI-04.
- [ ] `pnpm check` en verde.

## Evidencia y progreso

Pendiente de rellenar por quien implementa.

## Siguiente paso

Desbloquea AI-04 (evaluaciones con las métricas de la sección 22.6) y deja el prompt listo para revisión de contenido.

## Cambios de alcance aceptados

Ninguno.
