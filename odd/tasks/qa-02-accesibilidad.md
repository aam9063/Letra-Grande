# QA-02: accesibilidad AA comprobada en la CI

## Objetivo y motivo

El proyecto promete accesibilidad AA y hoy lo cumple a mano: los specs de Playwright comprueban que no hay scroll horizontal a 375 px, `packages/design` fija el foco visible y el objetivo de 44 px, y los estilos ya respetan `prefers-reduced-motion`. Pero nada impide que una pantalla nueva entre con un contraste bajo, un control sin etiqueta o un `div` clicable. `@axe-core/playwright` está en `devDependencies` desde OPS-04 y no lo usa ningún spec: la dependencia está pagada y sin usar.

Esta tarea convierte esa promesa en una comprobación que corre en la CI sobre la app real, y añade las dos comprobaciones que axe no cubre: zoom al 200 % y movimiento reducido.

## Alcance y restricciones

- Dentro:
  - Spec de axe (`apps/web/e2e/accesibilidad.spec.ts`) sobre las rutas principales, con el nivel AA, que falla con la lista de violaciones y su selector.
  - Reglas desactivadas con motivo escrito, si alguna resulta ser un falso positivo del motor y no un problema real; nunca para tapar una violación.
  - Zoom al 200 %: sin scroll horizontal y sin contenido cortado en las rutas principales.
  - Movimiento reducido: con `prefers-reduced-motion: reduce`, ninguna animación ni transición con duración perceptible.
  - Corrección de las violaciones AA que aparezcan.
  - Documentación del recorrido manual con lector de pantalla, que no se puede automatizar, y su registro como comprobación humana pendiente.
- Fuera:
  - Cambiar los tokens de `packages/design` (otro carril): si la corrección es de color, se cambia el uso, no el token.
  - Suites e2e completas y el test `@live`: son de QA-07.
  - Revisión legal de textos: QA-03.
  - Rehacer pantallas: si aparece un problema de estructura grave, se registra y se decide aparte.
- Invariantes: sin dependencias nuevas (axe ya está), sin red nueva, sin datos personales en fixtures, y sin marcar como verificado lo que no se comprobó.

## Superficie de edición (nuestra)

`apps/web/e2e/**` (spec nuevo y helpers), `apps/web/src/**` (solo lo que haya que corregir), `docs/**`, `odd/tasks/qa-02-accesibilidad.md`, `odd/reviews/qa-02.md`.

Aviso de carril: `apps/web/e2e` es superficie compartida con los specs de interfaz; no toco los specs existentes salvo que una corrección lo exija, y en ese caso se avisa en el PR.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `playwright`. La accesibilidad real solo se comprueba en un navegador con la app construida.
- RED: el spec de axe y el de zoom fallan antes de corregir; el de movimiento reducido se escribe antes de comprobar que la regla CSS lo cubre de verdad.

## Riesgo y review (nuestra)

- Tipo: UI / accesibilidad.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 3 si una corrección cambia componentes compartidos que otras pantallas consumen (contraste de tokens aplicados, estructura de encabezados); elemento 6 mientras no exista el spec, porque una regresión de accesibilidad hoy no la detecta nada.

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] Spec de axe AA sobre las rutas principales.
- [x] Autocomprobación del propio spec: axe detecta un HTML roto conocido.
- [x] Zoom al 200 % (640 px de escritorio) y 375 px: sin scroll horizontal y con el título dentro del ancho. El contenido cortado por debajo queda para el recorrido manual.
- [x] Movimiento reducido sin animaciones perceptibles.
- [x] Recorrido manual con lector de pantalla documentado en `docs/accesibilidad.md` y registrado como pendiente humano en el backlog.
- [x] Documentación (`docs/accesibilidad.md`, README) y backlog actualizados.
- [x] `pnpm check` y `pnpm e2e` en verde.
- [ ] Review gate con informe en `odd/reviews/qa-02.md` y una ronda de correcciones.

## Evidencia y progreso

Rama `lg/qa-02-accesibilidad`, sobre `dev`.

### Lo que la app ya cumplía

Las once rutas pasaron axe con las etiquetas `wcag2a` y `wcag2aa` a la primera, sin violaciones: no había nada que corregir en `apps/web/src`. El valor de la tarea no es arreglar, es la guarda que impide que una pantalla nueva entre rota, más las dos comprobaciones que axe no cubre.

Esto es un resultado incómodo de escribir y conviene decirlo claro: un spec de accesibilidad que da verde a la primera puede ser un spec que no mide nada. Por eso lleva dentro su propia prueba.

### `apps/web/e2e/accesibilidad.spec.ts` (15 tests por proyecto, 60 en los cuatro)

- **11 de axe**, una por ruta: portada, hoy, carpeta, asistente, ayudas, datos, familia, reclamar, vida, ajustes y onboarding. El fallo lista la violación, su impacto y el selector de cada nodo.
- **1 de autocomprobación**: inyecta un HTML con una imagen sin `alt` y un botón sin nombre y exige que axe lo detecte (`image-alt`, `button-name`). Si el motor o el nivel se configuran mal, este test cae y el verde de los otros once deja de valer.
- **2 de zoom**: escritorio al 200 % (640 px de ancho en CSS, que es lo que calcula el navegador con zoom al doble sobre 1280) y móvil a 375 px. En cada ruta: sin scroll horizontal y el título visible y dentro del ancho. Un texto recortado no lo detecta: eso va en el recorrido manual.
- **1 de movimiento reducido**: con `prefers-reduced-motion: reduce`, recorre el DOM y no admite ninguna animación ni transición de más de 0.01 s. La regla global deja 0.01 ms; el margen de 10 ms es para el redondeo de los motores. Solo mira CSS: no ve `element.animate()` ni el shadow DOM, que hoy la app no usa.

### Verificación

- `pnpm e2e`: 174 pasan, 2 saltados (los `@live`), en los cuatro proyectos. Antes de esta tarea eran 114: 60 comprobaciones nuevas.
- `pnpm check`: verde.

### Seguimiento anotado por el review

Las 60 comprobaciones nuevas engordan el job de `e2e`, que tiene 15 minutos y 2 workers en la CI. No afectan al job `perf` de QA-05, que es otro. Si al fusionar la duración del job se acerca al límite, se parte cada bucle de zoom y de movimiento reducido en un test por ruta en vez de recorrer las once dentro de uno solo. No se hace ahora: es una decisión que necesita la medida real de la CI.

### Lo que no se puede automatizar

El recorrido con lector de pantalla. `docs/accesibilidad.md` deja el procedimiento (teclado, NVDA o VoiceOver, y los tres flujos que de verdad tocan datos) y el backlog lo registra como pendiente de una persona. No se marca como hecho en ninguna parte: la accesibilidad de la app está comprobada en lo automático y no en lo que depende de alguien escuchando la interfaz.
