# Review gate OPS-04: base de tests e2e con Playwright

---
tarea: OPS-04
base: 8d605d4
revisado: a8d86e8
revisor: jd-judge-a (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

El job `e2e` no puede pasar en falso: no hay `continue-on-error` ni `|| true`, la instalación con `--frozen-lockfile`, la instalación de navegadores y la regeneración de fixtures van antes de `pnpm e2e`, y Playwright falla si el `grep` deja cero tests. El smoke exige encabezado y aviso de independencia por rol y texto accesible. El guardián de red se prueba a sí mismo con `page.route` (sin salida real a la red) y comprueba la lista exacta de violaciones, lo que demuestra también que el mismo origen no da falsos positivos. La fixture es un PDF 1.4 generado a mano, determinista, sin dependencias nuevas y con datos ficticios. La configuración usa la build de producción en el puerto 3100, proveedor `mock` salvo `E2E_LIVE=1`, `@live` fuera de los PR, `forbidOnly` en CI y 240 s de margen. Sin `waitForTimeout`, sin selectores CSS y sin reloj real. `e2e/**` y la configuración entran en `pnpm typecheck`. Sin secretos, sin datos personales, sin rayas, títulos en español.

## Hallazgos

### 1. [recomendado] apps/web/e2e/smoke.spec.ts:8

Problema: `name: "Letra Grande"` coincide por subcadena, así que un encabezado que pasara a "Bienvenido a Letra Grande" seguiría en verde.
Propuesta: `exact: true` en el encabezado.
Riesgo del cambio: bajo, el smoke deja de detectar una regresión del título. Esfuerzo: S. Aplicado.

### 2. [nota] apps/web/e2e/helpers/network-guard.ts:15

Problema: solo escucha `page.on("request")`; las peticiones iniciadas por el service worker de la PWA no llegan al `page`, así que un futuro `privacy-network.spec` podría dar un falso negativo.
Propuesta: revisar y, si hace falta, escuchar también `context.on("request")` antes de escribir los specs de privacidad de la Ola 2.
Riesgo: medio en specs de privacidad futuros. Esfuerzo: S. Registrado como `REF-OPS-04`.

### 3. [nota] apps/web/playwright.config.ts:39

Problema: `process.env as Record<string, string>` oculta valores `undefined` en el entorno del `webServer`.
Propuesta: filtrar las entradas indefinidas o propagar solo las necesarias. Esfuerzo: S. Registrado como `REF-OPS-04b`.

### 4. [nota] docs/ARRANQUE.md, secciones 23.2 y 23.7

Problema: el documento dice que las fixtures PDF se versionan; la implementación las genera y las ignora, con el generador como fuente de verdad. La decisión está registrada en el documento de tarea, pero `ARRANQUE.md` queda divergente.
Propuesta: corregir la sección 23 del documento de arranque cuando se revise, o dejar constancia en `docs/e2e.md` cuando se escriba.

### 5. [nota] apps/web/playwright.config.ts:12

Problema: `pnpm e2e:live` fallará con "no tests found" hasta que exista QA-07.
Propuesta: documentarlo en QA-07. Sin acción hoy.

## Respuestas explícitas

- Code smells: el cast de `process.env` (hallazgo 3); `guardNetwork` devuelve una lista viva mutable, que es intencional y está documentado; `baseURL!` es el patrón habitual de Playwright.
- Secretos hardcodeados: ninguno.

## Qué se aplicó en la ronda de correcciones

- Hallazgo 1: `exact: true` aplicado en el smoke.
- Hallazgos 2, 3, 4 y 5: no se ejecutan. `REF-OPS-04` y `REF-OPS-04b` quedan registrados en `docs/backlog.md`.
