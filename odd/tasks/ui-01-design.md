# UI-01: sistema de diseño mínimo

## Objetivo y motivo

Crear `@letra-grande/design`: tokens de la sección 14, el componente `Callout` con sus cuatro tonos, los componentes de bloque de respuesta (uno por `kind` del catálogo cerrado) y una galería local navegable que sirva de referencia y de banco de pruebas de accesibilidad. Sin un sistema de diseño propio, cada carril inventaría estilos y la accesibilidad quedaría para el final.

## Alcance y restricciones

- Dentro: `packages/design/src/**` (tokens, hoja base, `Callout`, componentes de bloque, galería estática) y `packages/design/test/**` (render con `@testing-library/react`, comprobaciones de axe, foco visible y objetivos táctiles de 44 px).
- Fuera: shell, navegación, rutas y manifiesto PWA (UI-02); renderizador conectado a la IA y validación de servidor (AI-02); tipografía y acento definitivos (D-01 sigue pendiente).
- Invariantes del proyecto que aplican: WCAG 2.2 AA, foco visible, objetivos de 44 px, contraste medido, sin scroll horizontal a 375 px, respeto de `prefers-reduced-motion`, sin fuentes ni scripts de terceros, sin rayas largas ni medias rayas, español de tuteo en los textos de interfaz.
- D-01 pendiente: se usan familias del sistema (`system-ui`) y un token `--lg-acento` con valor provisional documentado, sin descargar ninguna fuente.

## Superficie de edición (nuestra)

`packages/design/**`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` con entorno `jsdom` y `@testing-library/react`; `axe-core` para las comprobaciones automáticas de accesibilidad.
- Fuente de la decisión: `AGENTS.md`.
- RED: primero los tests de cada componente (rol accesible, texto, tono, foco) y la comprobación de axe sobre la galería.

## Riesgo y review (nuestra)

- Tipo: interfaz y contrato de componentes.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 3 (los componentes son contrato para UI-02 y AI-02) y accesibilidad como requisito. Review centrada en: semántica y roles, contraste, tamaños táctiles, nombres de props, duplicación entre bloques, que la galería no dependa de un servidor y que no entre ninguna fuente ni script remoto.

## Tareas

- [ ] T1: tokens y hoja base con contraste comprobado (RED de la comprobación de contraste).
- [ ] T2: `Callout` con tonos info, aviso, peligro y éxito, con rol y texto accesible.
- [ ] T3: un componente por `kind` del catálogo de bloques, incluida la cita visible.
- [ ] T4: galería local que renderice todos los estados y pase axe sin errores.
- [ ] T5: `--passWithNoTests` eliminado y `pnpm check` en verde.

## Evidencia y progreso

Pendiente de rellenar por quien implementa: comandos, número de tests, resultado de axe.

## Siguiente paso

Desbloquea UI-02 y AI-02.

## Cambios de alcance aceptados

Ninguno.
