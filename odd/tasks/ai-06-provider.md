# AI-06: capa de proveedor de IA

## Objetivo y motivo

Definir la interfaz `LlmProvider`, sus dos adaptadores (`nan` compatible con OpenAI y `mock` determinista), la política de errores con reintentos, el circuit breaker y las protecciones de cuota, más `.env.example` y `docs/ai-provider.md`. El código nunca debe hablar con un proveedor concreto: ese es el requisito que permite cambiar de proveedor si las condiciones de NaN no sirven para producción (H-08).

## Alcance y restricciones

- Dentro: `packages/ai/src/**` (interfaz, `nan`, `mock`, clasificación de errores, reintentos con espera exponencial y variación aleatoria, circuit breaker, cuota por usuario anónimo, presupuesto diario), `packages/ai/test/**` con servidor simulado, `.env.example` y `docs/ai-provider.md`.
- Fuera: el proxy HTTP (AI-01), prompts y guardarraíles (AI-05), evaluaciones (AI-04), el catálogo de bloques (CORE-01).
- Invariantes del proyecto que aplican: la clave vive solo en variables de entorno del servidor, nunca en código, fixtures, logs, documentación ni variables `NEXT_PUBLIC_*`; ningún test hace red real; sin datos personales en tests; sin rayas largas ni medias rayas.

## Superficie de edición (nuestra)

`packages/ai/**`, `.env.example`, `docs/ai-provider.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest`.
- Fuente de la decisión: `AGENTS.md`.
- RED: con un `fetch` simulado, un 429 se reintenta y acaba resolviendo; un 401 no se reintenta ni una vez; el adaptador `mock` devuelve la misma respuesta para la misma pregunta en dos ejecuciones seguidas; `maxTokens` insuficiente se rechaza antes de llamar.

## Riesgo y review (nuestra)

- Tipo: proveedor de IA y credenciales.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 2 (credenciales y superficie de abuso) y elemento 5 (dependencia de un tercero). Review centrada en: que la clave no pueda acabar en el bundle del cliente, que los reintentos no dupliquen efectos ni disparen coste, que el circuit breaker se recupere solo, que la cuota no se pueda eludir con cabeceras falsas y que el `mock` sea determinista de verdad.

## Tareas

- [x] T1: tests con servidor simulado: 429 con reintento, 401 sin reintento, 5xx con reintento acotado (RED).
- [x] T2: interfaz `LlmProvider` y clasificación de errores (401, 402, 403, 404 sin reintento; 429 y 5xx con reintento).
- [x] T3: adaptador `nan` (base URL y clave desde entorno, sin valores por defecto secretos) y adaptador `mock` determinista.
- [x] T4: circuit breaker, cuota por usuario anónimo y presupuesto diario.
- [x] T5: `.env.example` sin secretos, `docs/ai-provider.md`, `--passWithNoTests` eliminado y `pnpm check` en verde.

## Evidencia y progreso

- RED: seis ficheros de test fallando por módulos inexistentes, cero tests ejecutados.
- GREEN: 46 de 46 tests en seis ficheros, con `fetch` simulado y relojes inyectados: ningún test abre un socket.
- `pnpm check` en la raíz en verde.
- Decisión de reintentos documentada: `maxAttempts` es 2 en total (original más un reintento), según la tabla de la sección 24.5, configurable en `DEFAULT_RETRY_OPTIONS`.
- La clave no aparece en ningún mensaje de error ni en ninguna respuesta; sin clave o sin modelo, el adaptador falla al arrancar y nunca usa un valor por defecto.
- El reintento por salida inválida (sección 24.5) no vive aquí: pertenece al proxy (AI-01).

Ronda de correcciones aplicada: guarda de servidor sin dependencias nuevas, circuit breaker que solo cuenta fallos reintentables, cuota con tope y expulsión, factoría que decora con protecciones, notas de coste y de `AbortSignal` documentadas y errata corregida. `REF-AI-06` registrado. Informe en `odd/reviews/ai-06.md`.

## Siguiente paso

Desbloquea AI-01.

## Cambios de alcance aceptados

Ninguno.
