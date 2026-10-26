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

- [ ] T1: tests del handler con proveedor simulado: rechazo por PII, paso de texto enmascarado, límite de cuota (RED).
- [ ] T2: handler sin estado, con validación de cuerpo y límite de tamaño.
- [ ] T3: segunda comprobación con `detect()` de `@letra-grande/privacy` y rechazo sin eco del texto.
- [ ] T4: rate limit y mensaje de degradación cuando el proveedor falla.
- [ ] T5: comprobar que no hay logging de contenido y `pnpm check` en verde.

## Evidencia y progreso

Pendiente de rellenar por quien implementa: comandos, número de tests y cómo comprobó la ausencia de logs con contenido.

## Siguiente paso

Desbloquea AI-03 y AI-05.

## Cambios de alcance aceptados

Ninguno.
