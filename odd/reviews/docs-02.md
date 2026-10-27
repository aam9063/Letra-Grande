---
tarea: DOCS-02
base: 8d9c5fc
revisado: af2c523
revisor: jd-judge-b
veredicto: aprobado con cambios
---

## Resumen

El extractor cumple S1 a S6: `pnpm --filter @letra-grande/extract test` (64 en verde) y `typecheck` pasan, la precisión es 140 de 140 con el umbral del 90 % calculado y no hardcodeado, `camposParaVault` produce exactamente los tipos que admite `VaultDocument.fields` de `packages/schema`, no hay red, dependencias nuevas ni `any`. Verifiqué el corpus a mano (f01, f05, f11, f15, f16, f17, f18 contra `verdad.json`) y lo regeneré fuera del repositorio con el propio script: sale byte a byte idéntico, así que la verdad no está amañada y coincide con el texto. Quedan dos recomendados baratos (un hueco de test sobre la intangibilidad del corpus y el comportamiento de primera-coincidencia ante líneas ambiguas) y dos notas.

## Comprobaciones hechas

- Criterios de aceptación: precisión calculada sobre 20 facturas × 7 campos, con `noLeidos` exacto y prohibición de inventar valores como comprobaciones adicionales más estrictas que el umbral.
- Corpus: los 20 .txt coinciden con `verdad.json`; regeneración reproducible (diff vacío). Todo ficticio (titulares "Persona de Ejemplo", NIF consecutivos, CUPS inventados) y sin URLs.
- Invariantes: `invoice.ts` no importa nada, no hay `fetch`, `http` ni rutas de fichero en el extractor; sin `any`; sin dependencias nuevas (solo el script npm `facturas`).
- Rendimiento: sin riesgo de retroceso catastrófico; una línea de 40.000 caracteres malformados se procesa en ~1 ms, y hay test de texto largo.
- Probes adversariales fuera del repositorio: CUPS con texto detrás queda a `null`; fecha imposible a `null`; un "P10" no se lee como "P1" (el patrón no casa, comportamiento honesto).

## Hallazgos

### 1. [recomendado] packages/extract/test/invoice-precision.test.ts (todo el fichero)
Problema: la precisión se mide contra `verdad.json` tal cual está en el repositorio, y nada comprueba que el corpus siga siendo el que genera `scripts/make-invoice-fixtures.mjs`. Un cambio futuro que edite a la vez un .txt y su entrada en `verdad.json` (o los reescriba desde la salida del extractor) ablandaría el test de precisión y el de "no inventa" sin que ningún test se note. Hoy el corpus está limpio (regeneración byte a byte idéntica), pero la garantía es convención, no test.
Propuesta: añadir un test que ejecute el generador en un directorio temporal y compare con `fixtures/facturas/` (o un paso equivalente en CI). Así cualquier edición manual del corpus o de la verdad rompe en rojo.
Riesgo del cambio: bajo. Esfuerzo: S.

### 2. [recomendado] packages/extract/src/invoice.ts:160-178 (buscar) y 181-196 (buscarTodos)
Problema: primera coincidencia gana, sin mirar las líneas siguientes. Comprobado: "Periodo de facturación: ver contrato" antes de la línea válida deja el periodo a `null` aunque el dato esté en el texto; y dos líneas en conflicto ("Consumo P1: 10,00 kWh" y "Consumo P1: 20,00 kWh") devuelven la primera en silencio, cuando S4 dice que lo ambiguo queda a `null` y se declara no leído. Lo mismo vale para un "total a pagar" de un recibo fraccionado antes del importe real (probe: lee 30 en vez de 62,35).
Propuesta: en `buscar`, seguir con la línea siguiente cuando el valor capturado no pase la validación de formato (o validar dentro de la búsqueda); en `buscarTodos`, si un periodo ya leído vuelve con valor distinto, marcarlo ambiguo y vaciarlo. El corpus no cambia, así que los tests existentes siguen en verde.
Riesgo del cambio: bajo. Esfuerzo: M.

### 3. [nota] odd/tasks/docs-02-factura.md (sección "Evidencia y progreso")
Problema: dice que los "5 del corpus y la precisión" van "con espía sobre fetch que rechaza", pero `invoice-precision.test.ts` no tiene ningún espía: el cerrojo de red solo existe en `invoice.test.ts`. El invariante está cubierto (el extractor es la misma función pura), pero el comentario de la tarea miente sobre dónde.
Propuesta: o se añade el espía al arnés de precisión (dos líneas en `beforeEach`) o se corrige la frase de la tarea.
Riesgo del cambio: bajo. Esfuerzo: S.

### 4. [nota] packages/extract/src/invoice.ts:60 (ETIQUETA_IMPORTE)
Problema: la etiqueta casa en cualquier parte de la línea, de modo que cualquier línea que contenga "total a pagar:" o "importe total:" cuenta como candidato del total. Con la búsqueda de primera coincidencia (hallazgo 2) esto es inofensivo en el corpus, pero conviene saberlo al añadir variantes reales al generador, como dice el README.
Propuesta: nada obligatorio; si se toca el hallazgo 2, aprovechar para anclar la etiqueta al inicio de línea o limitar el prefijo permitido.
Riesgo del cambio: bajo. Esfuerzo: S.

## Qué se aplicó en la ronda de correcciones

- Hallazgo 1 (recomendado), aplicado: el generador acepta un directorio de salida y hay un test que lo ejecuta en un temporal, compara la lista de ficheros y el contenido byte a byte con lo versionado. Editar a mano un `.txt` o `verdad.json` para ablandar la precisión ahora falla en la suite.
- Hallazgo 2 (recomendado), aplicado: los campos de una sola línea pasan por `buscarUnico`, que devuelve `null` si dos líneas dan valores distintos y salta las líneas que no se pueden convertir (una línea "Periodo de facturación: ver contrato" ya no bloquea la siguiente válida). La potencia y el consumo pasan por `buscarPorPeriodo`, que deja la lista entera vacía si un mismo periodo aparece con dos valores distintos. Seis tests nuevos fijan las dos caras: lo ambiguo queda sin leer y lo repetido con el mismo valor se acepta. Precisión tras el cambio: 140 de 140.
- Hallazgo 3 (nota), aplicado: el espía de `fetch` que rechaza está también en `invoice-precision.test.ts`, así que la extracción sobre el corpus entero queda cubierta, y el documento de tarea dice dónde está en cada fichero.
- Hallazgo 4 (nota), documentado: el README deja escrito que la etiqueta del importe se busca en cualquier parte de la línea y que una frase como "recibo total a pagar" se leería como importe; conviene tenerlo presente al añadir variantes reales al corpus.

Resultado: 71 tests en el paquete, `pnpm check` y `pnpm e2e` en verde.
Rellena el implementador.
