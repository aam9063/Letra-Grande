# OPS-04b: job de e2e sobre la imagen oficial de Playwright

## Objetivo y motivo

El job `e2e` se quedó colgado tres veces seguidas en el paso `playwright install --with-deps` (apt en el runner de Ubuntu), bloqueando la entrega de UI-01. La imagen oficial de Playwright trae Node, los cuatro navegadores y las dependencias del sistema, así que el job deja de depender de `apt` y baja de tiempo.

## Alcance y restricciones

- Dentro: `.github/workflows/check.yml`, job `e2e`.
- Fuera: la configuración de Playwright y los specs (`apps/web/`), el resto de jobs.
- Invariantes del proyecto que aplican: la CI sigue puenteando la entrega (no `continue-on-error`), el proveedor de IA sigue siendo `mock` y los artefactos siguen subiéndose.

## Superficie de edición (nuestra)

`.github/workflows/check.yml`.

## Modo TDD (nuestra)

- Activo: no, es configuración de CI sin comportamiento ejecutable local. Se justifica aquí.
- Verificación sustituta: el propio PR. El job nuevo debe pasar en verde y el resto (`check`, `review-report`) no debe cambiar de comportamiento.

## Riesgo y review (nuestra)

- Tipo: entrega y CI.
- Review gate: obligatorio (sección 22). Revisión centrada en que el job no pueda pasar en falso y en que la etiqueta de la imagen siga la versión de `@playwright/test` del lockfile.
- Riesgo: elemento 5 (CI y entrega).

## Tareas

- [x] Medir el problema: tres ejecuciones colgadas en `playwright install --with-deps`.
- [x] Cambiar el job a `container: mcr.microsoft.com/playwright:v1.64.1-noble`, la versión del lockfile.
- [x] Quitar el paso de instalación de navegadores y añadir `timeout-minutes: 15` para que un cuelgue falle en vez de bloquear.
- [ ] Verificar el job en verde en el PR.

## Evidencia y progreso

Versión de `@playwright/test` resuelta en `pnpm-lock.yaml`: 1.64.1, de ahí la etiqueta `v1.64.1-noble`. La imagen fija `PLAYWRIGHT_BROWSERS_PATH` y no necesita apt.

## Siguiente paso

Desbloquea el merge de UI-01 y deja el e2e estable para la Ola 2.

## Cambios de alcance aceptados

Ninguno.
