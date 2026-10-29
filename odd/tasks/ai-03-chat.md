# AI-03: la pantalla del asistente

## Objetivo y motivo

Todo lo que hay detrás del asistente está construido y probado: el proxy de IA con sus guardarraíles (AI-01, AI-02, AI-05), la recuperación BM25 sobre `content/` (AI-03a), el catálogo cerrado de bloques con cita obligatoria y el renderizador. Lo único que falta es **la pantalla**: `apps/web/src/app/(app)/asistente/page.tsx:8-13` es un marcador de posición que pinta un título y un aviso de "pendiente". Hoy nadie puede hacer una pregunta desde la app.

Esta tarea cierra la cadena: preguntar, ver la respuesta en bloques con su fuente, y que los errores se expliquen en vez de quedarse en un `fetch` fallido.

## Alcance y restricciones

- Dentro:
  - Componente cliente `components/asistente/VistaAsistente.tsx`, siguiendo el patrón de `carpeta` (página fina + componente cliente con estado).
  - Formulario con un campo de pregunta, envío por `POST /api/assistant` y lista de mensajes.
  - **`mask()` en el navegador antes de enviar**, que es el invariante del proyecto ("todo texto que vaya a la IA pasa antes por `mask()`") y hoy no se aplica en ninguna superficie.
  - Los cinco errores del endpoint traducidos a texto para quien usa la app, con el mismo criterio que el resto de la interfaz: qué pasó y qué puede hacer.
  - Estados de carga y de vacío; el resultado se pinta con `AssistantAnswerView` y sus bloques.
  - Spec de Playwright del flujo completo con `AI_PROVIDER=mock`, que ya es determinista.
  - Test de integración de la cadena con el `content/` real: pregunta, recuperación y respuesta con citas válidas.
- Fuera:
  - Mostrar `verified` y la fecha de verificación junto a la fuente: el endpoint ya lo devuelve, pero el tipo `Fuentes` de `packages/design` no lo tiene y ampliarlo es contrato compartido. Es de MOD-02 ("cada ficha muestra verificado el") y se queda ahí.
  - Historial persistente o múltiples conversaciones: el chat es de una pregunta por vez y no guarda nada.
  - Filtros por sector en la interfaz: el recuperador los soporta, pero el MVP no los necesita.
  - Cambiar el endpoint, la recuperación o los guardarraíles: aquí no se toca nada de eso.
- Invariantes: ningún dato personal sale del dispositivo sin enmascarar; ninguna respuesta se pinta fuera del catálogo de bloques; sin red nueva (solo el propio `/api/assistant`); accesibilidad AA, que la CI ya comprueba.

## Superficie de edición

`apps/web/src/app/(app)/asistente/page.tsx`, `apps/web/src/components/asistente/`, `apps/web/src/app/globals.css` (solo estilos del chat), `apps/web/e2e/asistente.spec.ts`, `packages/ai/test/` (solo el test de integración), `docs/backlog.md`, `odd/tasks/ai-03-chat.md`, `odd/reviews/ai-03.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` para el componente y para la integración de la cadena, `playwright` para el flujo real.
- RED: el test del componente (envía, pinta bloques, traduce cada error, enmascara antes de enviar) y el spec de Playwright escritos antes del componente.

## Riesgo y review (nuestra)

- Tipo: privacidad y UI.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 2 si el `mask()` del navegador no se aplica donde toca y sale texto con datos personales hacia el proxy; elemento 3 si se pinta contenido del modelo fuera del catálogo. Mitigación: el test del componente comprueba que lo enviado va enmascarado, el endpoint sigue rechazando PII como segunda barrera, y `AssistantAnswerView` no interpreta HTML.

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] RED del componente: envío, bloques, errores y máscara.
- [x] `VistaAsistente` y la página que lo monta.
- [x] Spec de Playwright del flujo con `mock`.
- [x] Test de integración de la cadena con el `content/` real.
- [x] `pnpm check` y `pnpm e2e` en verde, con axe AA en la ruta nueva.
- [ ] Review gate con informe y una ronda de correcciones.
- [ ] Backlog actualizado y PR.

## Evidencia y progreso

- RED del componente: el test de `VistaAsistente` (10 casos) falla al principio por no existir el componente (`Cannot find module './VistaAsistente'`). Después, en verde: envía la pregunta con `{{documento_1}}` y sin el DNI, pinta los bloques y la cita, muestra el estado vacío honesto y traduce los cinco errores del endpoint con qué pasó y qué hacer, además del fallo de red.
- Test de integración en `packages/ai/test/cadena-content.test.ts` (4 casos, verde): pregunta sobre la ficha real de suministro eléctrico, recuperación BM25 sobre `content/`, respuesta del catálogo cuyas citas resuelven contra el texto recuperado y superan los guardarraíles de tono y caducidad (la ficha no está verificada, así que la respuesta lleva su aviso), y rechazo de una cita a una fuente no recuperada.
- Espec de Playwright (`apps/web/e2e/asistente.spec.ts`): la tabla del mock responde con texto plano y el proxy solo acepta el JSON del catálogo (AI-02), así que los dos casos de respuesta (bloques y outOfScope) se prueban interceptando `POST /api/assistant` y respondiendo con el mismo cuerpo que produce el proxy real. El spec ancla además el comportamiento real de la cadena con el mock sin interceptar: `hola` (en la tabla del mock, sin ficha que la respalde) acaba en 503 y la pantalla traduce el error, porque el reintento del handler añade el prompt de corrección como último mensaje y el mock, que solo lee el último mensaje, lanza `LlmError`. Esa incompatibilidad mock/reintento es un hallazgo de esta tarea: con un proveedor que lea la conversación completa (nan) el reintento funciona y degrada a outOfScope. Queda para decisión posterior: hacerlo llegar a `outOfScope` o hacer que el mock lea toda la conversación.
- `pnpm e2e` completo en verde: 190 tests pasan y 2 saltados (los `@live`), con build de producción limpia y axe AA en las once rutas, incluida `/asistente` con contenido real. Los tests del asistente pasan en los cuatro proyectos. Dos hallazgos del camino (verificados con sondas y resueltos en el spec): en WebKit, `fill` antes de que la página se asiente dejaba el estado de React sin actualizar (el spec espera `networkidle`, como ya hacía `accesibilidad.spec.ts`), y las peticiones que atraviesan el service worker escapan a la intercepción de `page.route` en WebKit (el spec anula el registro del SW; el registrador captura el fallo).
- Desbloqueado con autorización de la persona responsable: `rutas.test.tsx` exige ahora el contrato nuevo de `/asistente` (h1, formulario, sin estado pendiente, como ya hizo con Carpeta en UI-07) y `AssistantAnswerView.tsx` importa de `@letra-grande/design/client`, la entrada que el paquete documenta para navegador. El barrel completo arrastraba `gallery/generate.tsx` (usa `node:fs`) y la build de Next fallaba; el hallazgo queda registrado como REF-QA-08-05b en el backlog.
