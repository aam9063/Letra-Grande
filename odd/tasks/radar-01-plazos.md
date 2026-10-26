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
- [ ] Tests de cada unidad, de los bordes de calendario y del `.ics`; `pnpm check` en verde.

## Evidencia y progreso

Pendiente de rellenar por quien implementa.

## Siguiente paso

Desbloquea RADAR-02 (interfaz "Hoy") y CARPETA-01 (vincular un documento a un plazo).

## Cambios de alcance aceptados

Ninguno.
