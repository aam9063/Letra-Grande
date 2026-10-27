# QA-01: auditoría de privacidad de red

## Objetivo y motivo

La promesa del proyecto es que ningún dato personal sale del dispositivo. Hoy lo comprueba `extract` con un espía de `fetch` en Node, y el guardián de `apps/web/e2e` solo mira las peticiones de una página y reimplementa sus propios patrones de datos personales. Esta tarea convierte esa promesa en una auditoría que corre en la CI sobre la app real: cualquier petición a un origen que no sea el nuestro, o cualquier cuerpo con datos personales sin enmascarar, pone el test en rojo.

## Alcance y restricciones

- Dentro:
  - Guardián a nivel de contexto (`context.on("request")`), no solo de página: así entran también las peticiones del service worker, que era el hueco registrado como `REF-OPS-04`.
  - Los patrones de datos personales dejan de estar duplicados: se usa `detect()` de `@letra-grande/privacy`, la misma implementación que enmascara.
  - Lista versionada de orígenes permitidos (`apps/web/e2e/allowed-origins.json`): vacía por defecto, porque hoy la app no habla con nadie.
  - Spec nuevo que recorre las rutas principales con el guardián activo y exige cero violaciones, y que comprueba que el guardián ha visto peticiones de verdad (un test que no ve nada no prueba nada).
  - Documentación del guardián y del procedimiento para añadir un origen.
- Fuera:
  - Cambiar la CSP o el proxy de IA (OPS-02 y AI-01).
  - Las pantallas nuevas de otros carriles; el spec solo recorre rutas que existen.
  - Auditar el tráfico de escritorio (DESK-02 tiene sus propias pruebas de red).
- Invariantes: sin orígenes ajenos permitidos, sin datos personales en cuerpos, y ninguna excepción que se pueda añadir sin pasar por revisión (la lista está versionada).

## Superficie de edición (nuestra)

`apps/web/e2e/**`, `docs/backlog.md`, `odd/tasks/qa-01-privacidad-red.md`.

Aviso de carril: `apps/web/e2e` es superficie compartida con la sesión de interfaz. No toco sus specs ni sus pantallas; solo el guardián, la lista de orígenes, un spec nuevo y un README.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `playwright` (el guardián solo se puede probar de verdad con un navegador).
- RED: el spec que exige cubrir peticiones del contexto y el que exige el mensaje con `detect()` fallan antes de tocar el guardián.

## Riesgo y review (nuestra)

- Tipo: privacidad.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 2 (la auditoría es la red de seguridad de la privacidad: un guardián que no ve las peticiones del service worker, o que da verde sin ver nada, es peor que no tenerlo) y elemento 6 (sin las comprobaciones, un cambio podría degradarlo en silencio).

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] Guardián a nivel de contexto, con la lista versionada de orígenes permitidos.
- [x] Detección de datos personales con `detect()` de `@letra-grande/privacy`, sin patrones duplicados.
- [x] Spec de auditoría de las rutas principales, con la comprobación de que el guardián ve peticiones.
- [x] Specs del propio guardián: origen ajeno, cuerpo con documento, cuerpo limpio y lista de orígenes.
- [x] Documentación en `apps/web/e2e/README.md`.
- [x] Backlog actualizado, con `REF-OPS-04` cerrado.
- [x] `pnpm check` y `pnpm e2e` en verde: 104 specs, 28 nuevas comprobaciones (6 tests en los 4 proyectos).

## Evidencia y progreso

Rama `lg/qa-01-privacidad-red`.

- `apps/web/e2e/helpers/network-guard.ts`: `guardNetwork(context | page, origenes)` escucha `context.on("request")` (o `page.on`), ignora `data:` y `blob:`, y anota dos clases de violación: origen no permitido y dato personal en el cuerpo. La decisión vive en `motivosDePeticion(...)`, que es pura y se prueba sin navegador.
- `origenesPermitidos(baseURL)` compone el origen de la app con los de `apps/web/e2e/allowed-origins.json`, que está vacío a propósito y dice en su propia nota que añadir un origen exige justificarlo en el PR.
- Los datos personales se detectan con `detect()` de `@letra-grande/privacy`: fuera los patrones duplicados que tenía el guardián, que podían desviarse de los que enmascaran.
- `privacidad-red.spec.ts` recorre `/`, `/hoy`, `/ajustes`, `/carpeta` y `/onboarding` con el guardián puesto y exige cero violaciones y haber visto peticiones. Otro test del mismo fichero fija que el guardián ve lo que pide una segunda página del contexto, que era el hueco de `REF-OPS-04`.
- `network-guard.spec.ts` prueba el guardián contra sí mismo: origen ajeno, documento en el cuerpo, cuerpo limpio sin falso positivo y composición de la lista de orígenes. Los seis tests corren en los cuatro proyectos de Playwright (Chromium, Firefox, WebKit y móvil): 24 comprobaciones.
- Nota de compatibilidad encontrada al hacerlo: en Firefox una `fetch` a un origen ajeno interceptado por `context.route` no siempre genera evento de petición; el test de cobertura entre páginas usa una navegación, que sí es fiable en los tres motores.

## Siguiente paso

Guardian a contexto, después el spec.

## Cambios de alcance aceptados

Ninguno por ahora.
