# AI-02: renderizador de bloques y validación de servidor

## Objetivo y motivo

Cerrar el circuito de las respuestas verificadas: el servidor valida la respuesta del modelo contra las fuentes recuperadas con `validateAnswerAgainstSources` y la interfaz pinta cada bloque del catálogo cerrado con su componente. Es lo que hace que una cifra inventada nunca llegue a la pantalla.

## Alcance y restricciones

- Dentro: `apps/web/src/components/blocks/**` (renderizador por `kind`, cita visible y enlace a la fuente), la integración de `validateAnswerAgainstSources` en el endpoint del asistente con un reintento ante error de validación y `outOfScope` como salida segura, y sus tests.
- Fuera: recuperación BM25 (AI-03), prompts de sistema y guardarraíles (AI-05), evaluaciones (AI-04), los componentes visuales base (`UI-01` ya los entrega), la interfaz completa del chat (Ola 2).
- Invariantes del proyecto que aplican: el modelo nunca escribe marcado, así que el renderizado no interpreta HTML ni markdown; todo bloque muestra al menos una cita; como máximo un bloque de aviso; los pasos se numeran 1, 2, 3; una respuesta que no valida se descarta y se responde con `outOfScope`; sin datos personales en tests.

## Superficie de edición (nuestra)

`apps/web/src/components/blocks/**`, `apps/web/src/app/api/assistant/**`, `apps/web/package.json`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` con `jsdom` para el renderizador y `node` para la validación de servidor.
- Fuente de la decisión: `AGENTS.md`.
- RED: un bloque con una cifra que no aparece en la fuente citada se descarta y la respuesta pasa a `outOfScope`; una cita a una fuente desconocida descarta el bloque; dos bloques `warning` no se muestran tal cual; un `claim` que contiene HTML se pinta como texto; cada `kind` del catálogo tiene su componente y su test.

## Riesgo y review (nuestra)

- Tipo: IA y contrato de presentación.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 3 (el contrato entre validación de servidor y render es lo que sostiene la promesa "ninguna afirmación sin fuente"). Review centrada en: que no exista un camino que pinte un bloque sin validar, que el descarte no deje la pantalla sin explicación, que `dangerouslySetInnerHTML` no aparezca en ningún sitio, accesibilidad de la cita y que el reintento no duplique la respuesta completa al modelo.

## Contrato que cambia

El endpoint del asistente deja de devolver `{ reply: string }` y pasa a devolver bloques validados del catálogo cerrado. AI-01 dejó ese texto crudo a propósito porque este contrato pertenece a AI-02. Al terminarlo, quitar `passWithNoTests` del proyecto `jsdom` de `apps/web/vitest.config.ts`: es la deuda que dejó AI-01 y aquí se salda con los tests de componentes.

## Tareas

- [x] T1: tests de validación contra fuentes: cifra no respaldada, fuente desconocida, exceso de avisos (RED).
- [x] T2: integración en el endpoint con un reintento y `outOfScope` como salida segura.
- [x] T3: renderizador de los seis `kind` con la cita visible y enlace a la fuente.
- [x] T4: caso de texto con marcado en un `claim` y estado vacío explicado.
- [x] T5: `pnpm check` en verde.

## Evidencia y progreso

- RED: nueve tests de servidor fallando (cifra no respaldada, fuente desconocida, dos avisos, JSON fuera del catálogo, reintento, aceptación de `outOfScope` y dos del contrato anterior de `reply`) y el test de componente sin módulo.
- GREEN: 33 de 33 en `apps/web`; `pnpm check`, `pnpm build` y `pnpm e2e` en verde.
- Contrato: la respuesta 200 pasa de `{ reply: string }` a `{ answer: AssistantAnswer, fuentes: Record<sourceId, { titulo, url }> }`. Los códigos de error no cambian y ninguno repite el contenido recibido.
- Reintento: como máximo dos llamadas al proveedor; la segunda envía solo los errores de validación, nunca la respuesta completa del modelo, comprobado con aserciones sobre el cuerpo enviado. Si vuelve a fallar, 200 con `outOfScope: true` y sin bloques.
- Fuentes: `retrieveSources` devuelve id, título, URL y texto; el texto valida las cifras y el título con la URL construyen el catálogo de citas enlazadas. Hasta AI-03 devuelve vacío, así que el endpoint responde `outOfScope`: degradación honesta y documentada.
- Ningún bloque se pinta sin validar: la vista solo consume respuestas ya validadas y el HTML dentro de un `claim` se pinta como texto.
- `passWithNoTests` retirado del proyecto `jsdom`, que ya tiene tests reales.

## Siguiente paso

Desbloquea AI-03 y MOD-01.

## Cambios de alcance aceptados

Ninguno.
