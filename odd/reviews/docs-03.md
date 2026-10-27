---
tarea: DOCS-03
base: 1800c19
revisado: a5e7acc
revisor: jd-judge-b
veredicto: aprobado con cambios
---

## Resumen

El clasificador es lógica pura, determinista y sin red, consume `DocumentKind` de `packages/schema` sin copiarlo, y el empate y la falta de evidencia caen en `otro` con confianza 0, como piden S1, S4 y S5. Verifiqué de forma independiente la precisión sobre el conjunto (36 de 36, confianzas entre 29 y 74, coincide con lo documentado) y el conjunto no se puede ablandar: el test lo regenera en un temporal y lo compara byte a byte, y fija en 36 el número de ficheros. La verdad de `verdad.json` coincide con el texto de los 36 `.txt`, todo es ficticio y con pie que lo dice. Solo dos hallazgos menores, ninguno de comportamiento.

## Hallazgos

### 1. [recomendado] packages/extract/src/classify.ts:42

Problema: el comentario del bloque `SENALES` dice que las señales que casi solo aparecen en un tipo "valen 3 (un CUPS, un boletín de denuncia, una prima)", pero dos señales de multa valen 4 (`expediente sancionador`, línea 91, e `importe a ingresar o pago voluntario`, líneas 94 a 97). El comentario miente sobre el esquema de pesos, que es justo lo que consultará quien añada una señal nueva; el README y el documento de la tarea sí dicen "3 o 4" y "4 las casi exclusivas".

Propuesta: actualizar el comentario a "valen 3 o 4 (4 las casi exclusivas, como el expediente sancionador o el importe a ingresar; 3 un CUPS, un boletín de denuncia o una prima)". No cambia comportamiento; los 87 tests deben seguir en verde.

Riesgo del cambio: ninguno (solo comentario). Esfuerzo: S.

### 2. [nota] packages/extract/scripts/make-document-fixtures.mjs:202

Problema: multa-2 va firmada por "Dirección General de Tráfico de Ejemplo", que contiene el nombre exacto de un organismo real (la Dirección General de Tráfico). La cabecera del propio generador dice "nunca debe contener datos reales ni imitar a una entidad que exista", y el resto de organismos son completamente ficticios (Villaejemplo, Ministerio de Ejemplo, Organismo Ficticio de Inspección). El sufijo "de Ejemplo" mitiga, y el texto del documento es inventado, así que no hay dato real, pero el nombre del cuerpo roza la regla.

Propuesta: renombrar a un organismo ficticio equivalente (por ejemplo "Organismo de Tráfico de Ejemplo") y regenerar el conjunto con `pnpm --filter @letra-grande/extract documentos`; el test de byte a byte confirma que los ficheros versionados y el script quedan alineados.

Riesgo del cambio: bajo (regenerar fixtures y comprobar tests). Esfuerzo: S.

## Comprobaciones hechas

- Precisión medida por mi cuenta fuera del repositorio: 36 de 36 (100 %), confianzas entre 29 y 74. Coincide con README, tarea y el test S2.
- `pnpm --filter @letra-grande/extract test`: 87 tests en verde (8 ficheros). `typecheck` en verde.
- Los 36 `.txt` cotejados a mano contra `verdad.json` y contra el generador: coinciden, incluidas las seis variantes sin su palabra más característica (factura-5, contrato-4, carta-4, multa-5, ticket-5, poliza-4).
- Probes adversarios con entradas realistas: una factura real que dice "contrato de suministro" clasifica como factura (58 de confianza); una póliza que menciona "factura de la prima" sigue siendo póliza (44); una sanción sin "expediente sancionador" ni "denuncia" con organismo público empata y cae en `otro`, que es el lado seguro; texto vacío, cortesía sola y empate triple dan `otro` con confianza 0.
- Empate: `primero.puntos <= segundo.puntos` devuelve `otro` antes de elegir; el orden del `sort` no influye.
- Rendimiento: 30 alternaciones simples sin backtracking catastrófico, lineal sobre el texto; el test de documento largo (unas 330 000 caracteres) pasa en milisegundos.
- Sin red: espía sobre `fetch` que rechaza, y `classifyDocument` no toca `fetch`, ficheros ni estado global.
- Tests de comportamiento, no de implementación: comprueban tipo, confianza, señales legibles y precisión; el umbral de 0.85 no se puede ablandar sin editar código visible, y el conjunto no se puede editar a mano (byte a byte contra el script, 36 ficheros fijados).
- Invariantes: sin datos personales reales (el test exige marcador de ficción en cada documento), sin URLs, sin rayas largas, sin `any`, sin dependencias nuevas externas (`@letra-grande/schema` es workspace y solo tipo).

## Qué se aplicó en la ronda de correcciones

- Hallazgo 1 (recomendado), aplicado: el comentario del bloque de señales decía que las señales exclusivas valen 3 y hay dos que valen 4. Corregido, nombrando las dos ("un expediente sancionador, un importe a ingresar") para que el comentario no pueda volver a desviarse del código.
- Hallazgo 2 (nota), aplicado: `multa-2` ya no dice "Dirección General de Tráfico de Ejemplo", que imita el nombre de un organismo real con un sufijo. Ahora es "Organismo Ficticio de Tráfico"; corpus regenerado y verdad sin cambios.

Resultado: 87 tests en el paquete, precisión 36 de 36, `pnpm check` y `pnpm e2e` en verde.

Rellena el implementador.
