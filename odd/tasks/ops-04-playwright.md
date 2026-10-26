# OPS-04: base de tests e2e con Playwright

## Objetivo y motivo

Poner la infraestructura de pruebas de interfaz antes de que existan flujos que probar: configuración de Playwright con cuatro proyectos, fixtures sintéticas, guardián de red que detecta salidas a orígenes no permitidos y datos personales en cuerpos de petición, un smoke test que pasa en los cuatro proyectos y el job de e2e en la CI con informe y trazas. Sin esto, las tareas de interfaz de la Ola 2 no pueden cerrar con su spec.

## Alcance y restricciones

- Dentro: `apps/web/playwright.config.ts` (sección 23.4), `apps/web/e2e/helpers/network-guard.ts` (sección 23.5), `apps/web/e2e/smoke.spec.ts`, `apps/web/e2e/fixtures/**` con el generador de PDF sintético (`pnpm fixtures`), los scripts `e2e`, `e2e:ui`, `e2e:live` y `fixtures` en `apps/web/package.json`, y el job `e2e` del workflow de CI con subida del informe.
- Fuera: specs de vault, privacidad, carpeta, asistente, radar y accesibilidad (tareas de la Ola 2 y QA-07); pantallas que todavía no existen; el test `@live` contra NaN (QA-07).
- Invariantes del proyecto que aplican: datos siempre sintéticos, nunca facturas reales; localizadores por rol, etiqueta o texto accesible, nunca por clase CSS; prohibido `waitForTimeout`; el proveedor de IA en CI es `mock`; el reloj se controla con `page.clock`; sin dependencias nuevas sin justificar.

## Superficie de edición (nuestra)

`apps/web/playwright.config.ts`, `apps/web/e2e/**`, `apps/web/package.json`, `.github/workflows/check.yml`.

## Modo TDD (nuestra)

- Activo: sí, en su forma natural: el entregable son tests.
- Runner: `playwright`.
- RED: el test del guardián de red debe fallar cuando se le cuela una petición a un origen no permitido (se prueba el guardián, no solo el flujo feliz), y el smoke debe fallar si la app no arranca en modo producción.
- Se ejecuta contra la build de producción: el service worker no se comporta igual en desarrollo.

## Riesgo y review (nuestra)

- Tipo: CI y entrega.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5 (el workflow nuevo puede bloquear PRs) y elemento 6 (si las pruebas son frágiles, nadie confiará en ellas). Review centrada en: que el job no pueda pasar en falso, timeouts razonables, determinismo, ausencia de dependencia de la fecha real y que el guardián no dé falsos positivos con orígenes propios.

## Tareas

- [ ] T1: configuración de Playwright con los cuatro proyectos y el servidor de producción (RED del smoke).
- [ ] T2: fixtures sintéticas y generador de PDF sin dependencias nuevas.
- [ ] T3: guardián de red con su propio test (un origen ajeno y un DNI en el cuerpo deben detectarse).
- [ ] T4: scripts de `apps/web` y job `e2e` de CI con informe como artefacto.
- [ ] T5: `pnpm e2e` en verde en los cuatro proyectos.

## Evidencia y progreso

- RED: el smoke falló antes de existir la configuración (sin servidor y sin navegador instalado) y el test del guardián falló con `Cannot find module ./helpers/network-guard`.
- GREEN: smoke 4 de 4 proyectos, guardián 4 de 4, `pnpm e2e` completo 8 de 8 (chromium, firefox, webkit y mobile-chrome), 15,5 s.
- Navegadores instalados en local con `playwright install`: los cuatro proyectos corrieron, ninguno quedó bloqueado en Windows.
- `pnpm check` en la raíz en verde.
- Generador de PDF sin dependencias nuevas: emite un PDF válido con stream sin comprimir y xref calculada, y se autocomprueba.
- La CI añade un paso `pnpm --filter @letra-grande/web fixtures` antes de `pnpm e2e`, porque los binarios generados no se versionan.

## Documentación entregada

`docs/e2e.md`: qué cubre e2e y qué cubre unidad, cómo se ejecuta en cada máquina, los cuatro proyectos, la decisión de generar las fixtures en lugar de versionarlas (y su diferencia con la sección 23.2 del documento de arranque), el guardián de red, el proveedor `mock`, las reglas de escritura de specs y la cobertura mínima por ola.

## Siguiente paso

Desbloquea los specs de interfaz de la Ola 2 y QA-07.

## Cambios de alcance aceptados

1. `apps/web/generated/`, `apps/web/test-results/` y `apps/web/playwright-report/` se añaden al `.gitignore` de la raíz: son artefactos regenerables y binarios. Lo hace el orquestador porque la raíz estaba fuera de la superficie del escritor.
2. `apps/web/tsconfig.json` incluye `e2e/**/*.ts` y `playwright.config.ts` para que `pnpm check` compruebe también los tipos de las pruebas, no solo los del código de la app.
