# DESK-02c: la app instalada arranca en Hoy, no en la landing

## Objetivo y motivo

Al abrir el instalador aparecía la landing. Esa página es la puerta de entrada de la web, donde la persona descarga la aplicación: dentro del producto ya instalado no tiene sentido y confunde. La app de escritorio debe abrir directamente en la pantalla de uso, Hoy, y dejar que el shell resuelva el primer arranque con su control de onboarding.

## Alcance y restricciones

- Dentro: la ruta de arranque de la ventana como valor explícito y probado, y la nota correspondiente en `docs/desktop.md`.
- Fuera: la landing y el onboarding, que pertenecen a la sesión de interfaz; el instalador en sí, que ya existe.
- Invariantes: la app no cambia de origen ni de protocolo; el guard de navegación sigue igual; el primer arranque lo decide `GateOnboarding`, no este cambio.

## Superficie de edición (nuestra)

`apps/desktop/src/navigation.ts`, `apps/desktop/src/app-url.test.ts`, `apps/desktop/src/main.ts`, `docs/desktop.md`, `odd/tasks/desk-02c-arranque.md`.

## Modo TDD (nuestra)

- Activo: sí, sobre la función pura.
- RED: los dos tests de `startUrl` se escriben antes del cambio; el que exige `/hoy/` falla con el arranque anterior en `/`.

## Riesgo y review (nuestra)

- Tipo: comportamiento del envoltorio.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 6 (una regresión de arranque no la detectaría nadie hasta ver la pantalla equivocada). La revisión confirma que la ruta existe en la exportación estática y que el arranque no salta el onboarding.

## Tareas

- [x] Ruta de arranque explícita y función que compone la URL.
- [x] Dos tests: la ruta es `/hoy/` y el origen se respeta.
- [x] Nota en la tabla de diferencias con la PWA.
- [ ] Verificar en el instalador regenerado.

## Evidencia y progreso

- 38 tests en `apps/desktop`, dos de ellos nuevos.
- La review rechazó la primera versión por un motivo real: la exportación de Next escribía `hoy.html` plano, así que `/hoy/` caía al respaldo y seguía abriendo la landing. Corregido con `trailingSlash: true` en el modo escritorio, un test que resuelve la URL de arranque contra la forma real de la exportación y una comprobación en CI de que existen `index.html` y `hoy/index.html` después de construir la exportación.
- El primer arranque sigue pasando por `GateOnboarding`, que vive en el layout del grupo de la aplicación: el cambio no lo salta, solo evita la landing.

Corrección tras el rechazo: `trailingSlash` en el modo escritorio, test que resuelve la URL de arranque contra la exportación real y guard en CI sobre `index.html` y `hoy/index.html`. Informe en `odd/reviews/desk-02c.md`.

## Siguiente paso

Regenerar el instalador y comprobar que abre en Hoy.

## Cambios de alcance aceptados

Ninguno.
