# UI-02: shell de la PWA, rutas y offline básico

## Objetivo y motivo

Dar a Letra Grande su carcasa: layout con navegación inferior, una ruta por módulo (Hoy, Asistente, Carpeta, Reclamar y bajas, Vida, Ayudas, Datos, Familia), manifiesto e iconos, service worker con offline básico y una portada real. Es lo que convierte el esqueleto en una app instalable y lo que permite que la Ola 2 monte módulos sobre rutas estables.

## Alcance y restricciones

- Dentro: `apps/web/src/app/**` (layout, rutas de módulo con contenido provisional honesto, portada), `apps/web/src/components/shell/**`, `apps/web/public/**` (manifiesto, iconos, service worker), `apps/web/next.config.ts` (transpile de `@letra-grande/design`), configuración de `vitest` con `jsdom` para tests de componentes y el script `test` de `apps/web`, más tests propios del shell.
- Fuera: contenido y lógica de cada módulo (Ola 2), vault, asistente, configuración de Playwright y sus specs (OPS-04), estilos de los bloques de respuesta (UI-01), cabeceras CSP y despliegue (OPS-02).
- Invariantes del proyecto que aplican: sin dependencias de terceros en el navegador, sin analytics ni fuentes remotas; WCAG 2.2 AA, foco visible, objetivos de 44 px, sin scroll horizontal a 375 px, respeto de `prefers-reduced-motion`; nada importante oculto ni truncado; textos en español de tuteo; sin rayas largas ni medias rayas; cada ruta declara de forma visible que su contenido todavía no está disponible en lugar de inventarlo.

## Superficie de edición (nuestra)

`apps/web/src/**`, `apps/web/public/**`, `apps/web/next.config.ts`, `apps/web/vitest.config.ts`, `apps/web/package.json`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` con `jsdom` y `@testing-library/react` para el shell; los flujos completos se cubren con Playwright en OPS-04 y en la Ola 2.
- Fuente de la decisión: `AGENTS.md`.
- RED: la navegación expone los ocho destinos por rol `navigation`; cada ruta renderiza su encabezado de nivel 1; la portada muestra el aviso de independencia; el manifiesto declara `name`, `start_url`, `display` y los iconos existen; el service worker no precachea ningún dato de usuario.

## Riesgo y review (nuestra)

- Tipo: interfaz y entrega.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 3 (las rutas son contrato para todos los módulos de la Ola 2) y elemento 5 (un service worker mal versionado sirve versiones viejas o cachea datos). Review centrada en: estrategia de caché y versionado del service worker, que no precachee nada personal, accesibilidad de la navegación, coherencia del manifiesto, ausencia de red a terceros y que ninguna ruta prometa contenido inexistente.

## Tareas

- [ ] T1: shell con navegación inferior accesible y tests de roles y destinos (RED).
- [ ] T2: ocho rutas de módulo con encabezado propio y estado "pendiente" honesto.
- [ ] T3: manifiesto, iconos y service worker con estrategia de caché documentada y versionada.
- [ ] T4: `transpilePackages` para `@letra-grande/design`, `vitest` configurado y script `test` del paquete.
- [ ] T5: `pnpm check` y `pnpm build` en verde, sin scroll horizontal a 375 px.

## Evidencia y progreso

Pendiente de rellenar por quien implementa: comandos, número de tests, comprobación de 375 px.

## Siguiente paso

Desbloquea los módulos de la Ola 2 y QA-02, QA-05.

## Cambios de alcance aceptados

Ninguno.
