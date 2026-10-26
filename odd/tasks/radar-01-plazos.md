# RADAR-01: cálculo de plazos y exportación de calendario

## Objetivo y motivo

El radar es lo que hace volver a la app: una línea de tiempo con lo que vence. Para eso hace falta el motor, independiente de la interfaz: sumar un plazo a una fecha de origen, decidir en qué estado está, ordenar y exportar a `.ics` para que la persona lo vea en su calendario. Es lógica pura, sin red y sin navegador, así que se prueba entera con `vitest`.

## Alcance y restricciones

- Dentro: paquete nuevo `packages/radar` con el cálculo de fechas por unidad (`dias_naturales`, `dias_habiles`, `meses`, `anios`), el estado de un plazo a partir de una fecha de referencia, el orden de la línea de tiempo y la generación de un archivo `.ics` válido.
- Fuera: la interfaz de "Hoy" (RADAR-02), el calendario laboral por comunidad y localidad, la exportación desde la app y cualquier llamada de red.
- Invariantes del proyecto que aplican: los días hábiles se calculan como aproximación (fines de semana, sin festivos) y **el resultado lo declara**; el motor no inventa fechas ni plazos, solo suma lo que la ficha dice; sin dependencias de terceros; sin datos personales en los tests.

## Superficie de edición (nuestra)

`packages/radar/**`, `pnpm-lock.yaml`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest`.
- Fuente de la decisión: `AGENTS.md`.
- RED: primero los casos de cada unidad de plazo y los del `.ics`, viendo fallar el paquete inexistente.

## Riesgo y review (nuestra)

- Tipo: lógica de dominio con fechas.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 6 (una regresión en el cálculo de fechas no la detectaría nadie hasta que alguien pierda un plazo). Review centrada en: cambios de mes y año, años bisiestos, fin de mes (`31 de enero` más un mes), horario de verano, el orden estable de la línea de tiempo y la validez del `.ics` (plegado de líneas, escapado, fechas de todo el día, `UID` estable).
- Riesgo de la tarea: ninguno de los seis elementos de alto riesgo. No toca datos guardados, seguridad ni contrato público.

## Tareas

- [x] `packages/radar` con su `package.json`, `tsconfig.json` y `vitest.config.ts`, sin dependencias nuevas.
- [x] `addDeadline`: suma por unidad con resultado que declara si es aproximado.
- [x] `deadlineStatus`: estado a partir de la fecha de referencia (`vencido`, `hoy`, `proximo`, `lejano`, `hecho`, `descartado`).
- [x] `sortRadarItems` y `upcoming`: orden estable y filtro por ventana de días.
- [x] `toIcs`: generación del calendario con `VERSION`, `PRODID`, `VEVENT` de todo el día, `UID` estable y escapado.
- [x] Tests de cada unidad, de los bordes de calendario y del `.ics`; `pnpm check` en verde.

## Evidencia y progreso

- RED: la suite falló antes de implementar ("Failed to resolve import ../src/index"), cero tests ejecutados.
- GREEN: 26 de 26 tests.
- API pública: `addDeadline(from, rule)` devuelve `{ dueDate, aproximado }`; `deadlineStatus(item, today)`; `sortRadarItems(items)`; `upcoming(items, days, today)`; `toIcs(items, { now, calendarName?, prodId? })`. El reloj siempre es parámetro: la librería no llama a `Date.now()`.
- Aritmética en UTC y con validación de ida y vuelta: rechaza `2026-02-30`. Meses y años suman sobre año y mes y recortan el día al último del mes destino (`2026-01-31` más un mes da `2026-02-28`; `2028-02-29` más cuatro años da `2032-02-29`). Los días hábiles cuentan desde el día siguiente saltando sábados y domingos, solo fines de semana, y devuelven `aproximado: true`.
- `.ics`: líneas CRLF, `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID`, `CALSCALE`, un `VEVENT` de todo el día por elemento pendiente, `UID` estable derivado del id, `DTSTAMP` del reloj inyectado, `DTSTART;VALUE=DATE` y `DTEND` al día siguiente, sin `TZID`.
- Escapado y plegado: se escapa la barra invertida primero y después punto y coma, coma y saltos de línea; el plegado a 75 octetos es seguro con multibyte porque mide con `TextEncoder`. Los tests comprueban la cadena escapada exacta, que ninguna línea supera 75 octetos y el desplegado de ida y vuelta.
- Garantías: un test recorre el código fuente y comprueba que no hay `fetch` ni `XMLHttpRequest`, y que los elementos de prueba no contienen patrones de email, teléfono ni documento.
- `pnpm check` en la raíz en verde.

## Siguiente paso

Desbloquea RADAR-02 (interfaz "Hoy") y CARPETA-01 (vincular un documento a un plazo).

## Cambios de alcance aceptados

Ninguno.
