# OPS-01: esqueleto del repositorio, configuración y CI

## Objetivo y motivo

Crear el repositorio de Letra Grande con la estructura, la configuración y las reglas que el resto de tareas dan por hechas: monorepo pnpm, TypeScript estricto, estilo comprobado, `AGENTS.md`, aviso de independencia y una CI que ejecuta `pnpm check`. Sin esto ninguna otra tarea de la Ola 1 puede empezar.

## Alcance y restricciones

- Dentro: archivos de configuración de la sección 7, `AGENTS.md` y `CLAUDE.md` de la sección 11, `README.md` con el aviso de la sección 12, `docs/backlog.md` generado desde la sección 17, el job `check` de CI, los esqueletos de los paquetes de la Ola 1 y una app Next.js mínima.
- Fuera: plantillas de contenido y validador completo del contenido (CORE-01), `packages/radar` y `packages/extract` (tareas de la Ola 2), Playwright y su job de CI (OPS-04), shell de la PWA y service worker (UI-02), `.env.example` y capa de proveedor de IA (AI-06), guía de verificación y plantillas de PR (CONTENT-01, OPS-05).
- Invariantes del proyecto que aplican: sin datos inventados, sin datos personales, sin secretos en el repositorio, sin dependencias de terceros en el navegador, sin rayas largas ni medias rayas.

## Superficie de edición (nuestra)

Raíz del repositorio (configuración y documentación), `scripts/`, `.github/workflows/check.yml`, `packages/schema`, `packages/privacy`, `packages/design`, `packages/ai`, `packages/vault`, `content/*/.gitkeep`, `apps/web`, `odd/tasks/ops-01-repo-base.md`.

## Modo TDD (nuestra)

- Activo: sí, con una excepción justificada.
- Runner: `vitest` para las tareas con lógica, `playwright` para las de interfaz.
- Fuente de la decisión: `AGENTS.md`.
- Excepción: OPS-01 no añade lógica de dominio, solo estructura y configuración. La verificación es la propia suite: `pnpm style`, `pnpm typecheck`, `pnpm test`, `pnpm content:validate` y `pnpm build` en verde.

## Riesgo y review (nuestra)

- Tipo: otro (andamiaje del repositorio).
- Review gate: obligatorio (sección 22). Revisión centrada en que las reglas del proyecto se puedan cumplir desde el primer día: estilo, tipos estrictos, lockfile reproducible, ausencia de secretos y de dependencias innecesarias.
- Riesgo de la tarea: ninguno de los seis elementos de alto riesgo. No toca datos, seguridad, contratos públicos, concurrencia ni entrega; la CI es nueva y no desplegada.

## Tareas

- [x] Escribir este documento antes de la primera escritura.
- [x] Crear la configuración de la raíz desde la sección 7.
- [x] Añadir `LICENSE` (MIT), `README.md` con el aviso de independencia y `docs/backlog.md`.
- [x] Copiar `AGENTS.md` y `CLAUDE.md` de la sección 11.
- [x] Crear el job `check` de CI.
- [x] Crear los esqueletos de `schema`, `privacy`, `design`, `ai` y `vault` con todas sus dependencias declaradas por adelantado, para que las tareas en paralelo no toquen `pnpm-lock.yaml`.
- [x] Crear la app Next.js mínima con la portada y los tokens de color.
- [x] Instalar y comprobar: `pnpm install`, `pnpm check`, `pnpm build`.

## Evidencia y progreso

Decisiones tomadas durante la tarea:

1. `packages/radar` y `packages/extract` no se crean vacíos: un paquete sin tests ni código obligaría a usar `--passWithNoTests` de forma permanente o a inventar un test vacío. Se crean en sus tareas de la Ola 2.
2. Cada paquete declara sus dependencias futuras desde el primer día aunque todavía no las use, para que las cuatro tareas en paralelo de la Ola 1 no compitan por `pnpm-lock.yaml`.
3. `test` arranca como `vitest run --passWithNoTests`; la tarea que añade el primer test real quita el flag, de modo que la suite falla si un paquete se queda sin tests.
4. La CI trae solo el job `check`. El job de e2e lo añade OPS-04 junto con la configuración de Playwright, para no dejar la CI en rojo en el primer PR.
5. `packages/schema/scripts/validate-content.ts` es un validador provisional (solo sintaxis YAML) que CORE-01 sustituye por el de la sección 8.7.

6. `scripts/check-style.mjs` del documento usaba `new URL("..", import.meta.url).pathname`, que en Windows devuelve `/C:/...` y rompe el recorrido. Se cambia a `fileURLToPath`, sin cambio de comportamiento en Linux.

## Siguiente paso

Desbloquea CORE-01, CORE-02, UI-01 y OPS-04, que van en paralelo.

## Cambios de alcance aceptados

Ninguno.
