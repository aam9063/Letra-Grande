# AI-01: proxy de IA sin estado

## Objetivo y motivo

Exponer un único endpoint de servidor que reciba texto ya enmascarado, lo vuelva a comprobar, llame al proveedor a través de `LlmProvider` y no guarde nada. Es la segunda barrera de privacidad (defensa en profundidad) y el único punto de la app que puede hablar con la IA.

## Alcance y restricciones

- Dentro: `apps/web/src/app/api/assistant/route.ts` y los módulos de apoyo que ese endpoint necesite dentro de `apps/web/src/app/api/**`, más sus tests.
- Fuera: prompts y guardarraíles (AI-05), recuperación BM25 (AI-03), evaluaciones (AI-04), la capa de proveedor (`AI-06` ya la entrega), el renderizado de bloques (`AI-02`), la interfaz del contador de datos ocultos (Ola 2).
- Invariantes del proyecto que aplican: no se guarda el cuerpo de la petición ni se registra su contenido; si `detect()` encuentra datos personales, la petición se rechaza; la clave vive solo en el entorno del servidor; ninguna respuesta repite el texto recibido; sin datos personales en tests; sin rayas largas ni medias rayas.

## Superficie de edición (nuestra)

`apps/web/src/app/api/**`, `apps/web/vitest.config.ts`, `apps/web/package.json`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` en entorno `node`, invocando el handler de la ruta directamente con `Request` sintéticas.
- Fuente de la decisión: `AGENTS.md`.
- RED: una petición con un DNI se rechaza con un error que no repite el texto; una petición correcta pasa texto enmascarado al proveedor simulado; el doble rechazo (cliente que no enmascara) queda registrado solo como métrica sin contenido; ningún log contiene el cuerpo; el límite de peticiones por usuario anónimo devuelve 429 tras agotar la cuota.

## Riesgo y review (nuestra)

- Tipo: proxy de IA y privacidad.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 2 (superficie expuesta a abuso y a fuga de datos personales) y elemento 5 (dependencia de un servicio externo). Review centrada en: que no exista ningún camino que registre el texto, que el rechazo no devuelva el contenido, que el rate limit no se pueda eludir con cabeceras falsas, que no haya SSRF ni forma de inyectar el prompt de sistema desde el cuerpo y que el endpoint degrade con un mensaje honesto cuando el proveedor falla.

## Tareas

- [x] T1: tests del handler con proveedor simulado: rechazo por PII, paso de texto enmascarado, límite de cuota (RED).
- [x] T2: handler sin estado, con validación de cuerpo y límite de tamaño.
- [x] T3: segunda comprobación con `detect()` de `@letra-grande/privacy` y rechazo sin eco del texto.
- [x] T4: rate limit y mensaje de degradación cuando el proveedor falla.
- [x] T5: comprobar que no hay logging de contenido y `pnpm check` en verde.

## Evidencia y progreso

- RED: `vitest run` falló con `Cannot find module './anonymous-id'` antes de existir el handler.
- GREEN: 11 de 11 tests del handler; `pnpm check` en la raíz en verde.
- Runtime: `nodejs`, porque la guarda de servidor de `@letra-grande/ai` y sus adaptadores apuntan a Node y así `fetch`, el hashing y las variables de entorno se comportan igual en local y en producción.
- Contrato: `POST { question }` acotado a 4000 caracteres y 20 KiB de cuerpo. Respuestas de error tipadas `{ error: { code, message } }` con códigos `invalid_body`, `payload_too_large`, `unmasked_data`, `rate_limited` y `service_unavailable`. Ninguna respuesta repite el texto recibido.
- Segunda barrera: `detect()` sobre la pregunta; si encuentra algo, se responde 422 con un mensaje que pide enmascarar en el navegador y no incluye el valor detectado.
- Identificador anónimo: SHA-256 truncado de la primera IP de `X-Forwarded-For`, el `User-Agent` y `Accept-Language`. Limitación documentada en el código: es una freno barato, no autenticación; si la plataforma no reescribe `X-Forwarded-For`, se puede falsificar, y varias personas detrás de un mismo proxy comparten cubo.
- Sin logs de contenido: el handler no llama a `console` en ningún camino; un test espía `log`, `warn`, `error`, `info` y `debug` durante una petición correcta y otra fallida con una pregunta marcada y comprueba que ninguna salida la contiene.
- Nota para AI-02: el proyecto `jsdom` de `apps/web/vitest.config.ts` usa `passWithNoTests` hasta que AI-02 añada tests de componentes; AI-02 debe quitar esa bandera al añadirlos.

## Siguiente paso

Desbloquea AI-03 y AI-05.

## Cambios de alcance aceptados

Ninguno.
