# Review gate RADAR-01: motor de plazos y exportación de calendario

---
tarea: RADAR-01
base: aaebe02
revisado: a6f30b8
revisor: jd-judge-b (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

Verificado ejecutando la suite (26 de 26) y el typecheck. Aritmética correcta en los casos que importan: `2026-01-31` más un mes da `2026-02-28`, el bisiesto `2028` se respeta, `2028-02-29` más cuatro años da `2032-02-29` y los días hábiles cuentan desde el día siguiente (comprobado: miércoles 2026-02-04 más tres hábiles da lunes 2026-02-09). Todo en UTC, sin deriva de zona ni de horario de verano. Las fechas imposibles se rechazan por validación de ida y vuelta, y `aproximado` solo se activa en días hábiles. Los bordes de estado en 0, 7 y 8 días son correctos, los hechos y descartados van al final y la ordenación es estable sin mutar la entrada. El `.ics` cumple lo esperado salvo el plegado: CRLF, cabecera de calendario, `DTSTART;VALUE=DATE` con `DTEND` al día siguiente, `DTSTAMP` del reloj inyectado, `UID` estable y escapado con la barra invertida primero. Determinismo comprobado: sin `Date.now`, sin `Math.random`, sin `Intl` ni `toLocale*`, sin red ni temporizadores. Sin dependencias nuevas, sin `any`, comentarios en español, fixtures ficticias, sin secretos.

## Hallazgos

### 1. [recomendado] packages/radar/src/index.ts:213-227 (`plegarLinea`)

Problema: los trozos de continuación podían medir 75 octetos y, al añadir el espacio inicial, la línea plegada llegaba a 76. RFC 5545 limita la línea completa a 75 octetos, y un analizador estricto puede rechazar el archivo: exactamente el fallo silencioso que esta tarea debe evitar. Reproducido con un `SUMMARY` de 160 caracteres: líneas de 75, 76 y 19 octetos.
Propuesta: limitar el contenido de las continuaciones a 74 octetos, o plegar midiendo la línea ya prefijada. Aplicado: primera línea hasta 75 y continuaciones de 74 de contenido, con corte seguro en multibyte.
Hueco de test detectado: el test de plegado existente no lo detectaba porque su título generaba una continuación de 21 octetos. Aplicado: dos tests nuevos, uno con 160 ASCII que exige que **ninguna** línea pase de 75 octetos con el espacio incluido, y otro multibyte que además comprueba que el desplegado devuelve el texto original.

### 2. [recomendado] packages/radar/src/index.ts:243-257 (`upcoming`)

Problema: `days` no se validaba, así que un valor negativo o no entero devolvía una lista vacía en silencio, mientras que `addDeadline` sí validaba `amount`.
Propuesta: misma validación. Aplicado, con test de rechazo.

### 3. [nota] `itemItem`

Parámetro y variable con nombre de error de renombrado. Aplicado: `item`.

### 4. [nota] Tests que faltaban

Lista vacía en `toIcs`, `sortRadarItems` y `upcoming`; `dias_habiles` con `amount` 0 y negativo; y arrastre de año desde `2026-12-31` con uno y dos meses. Aplicados todos.

### 5. [nota] Orden por cadena

`sortRadarItems` y `upcoming` comparan `dueDate` como cadena `AAAA-MM-DD`, formato que garantiza el esquema, y `deadlineStatus` y `toIcs` sí validan. Aceptable: documentado en el código con un comentario que dice de qué depende.

## Olores de código

`itemItem` (corregido), `DTSTAMP` recalculado dentro del bucle de `toIcs` con el mismo valor (inofensivo) y un par de funciones internas de conversión a UTC algo enredadas. Nada bloqueante. Sin secretos.

## Qué se aplicó en la ronda de correcciones

Hallazgos 1 y 2 corregidos con sus tests, más las notas 3, 4 y 5. Resultado: 34 tests en verde, `typecheck` limpio y `pnpm check` en verde. En la misma rama se documenta el motor en `docs/data-model.md` (sección 10) y se actualiza `docs/ARCHITECTURE.md` y el estado del backlog.
