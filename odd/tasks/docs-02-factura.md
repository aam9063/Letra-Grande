# DOCS-02: extractor de factura de luz

## Objetivo y motivo

Leer una factura de la luz y sacar sus datos es lo primero que la persona espera de la app: sin esos campos no hay explicación por conceptos (MOD-03), ni comparación, ni aviso de potencia. El texto ya llega en local desde DOCS-01a (PDF) y DOCS-01b (foto); ahora hace falta entendernos con el texto.

## Alcance y restricciones

- Dentro:
  - `packages/extract/src/invoice.ts`: `extractInvoiceFields(text)` devuelve comercializadora, CUPS, periodo, potencia contratada, tarifa, consumo por periodo e importe total, más la lista de campos que no se han podido leer.
  - Lógica pura sobre texto, sin red, sin ficheros y sin estado global: la misma entrada produce siempre la misma salida.
  - Normalización de valores: fechas a `AAAA-MM-DD`, importes a número de euros, consumos a kWh, potencias a kW y CUPS a su forma compacta en mayúsculas.
  - Un campo que no aparece, o que aparece de forma ambigua, queda a `null` y se declara en `noLeidos`. Nada de valores por defecto inventados ni de adivinar.
  - Corpus de 20 facturas sintéticas con su verdad esperada, generado por un script reproducible, y un test de precisión que falla por debajo del 90 %.
  - Un `camposParaVault()` que aplana el resultado a los tipos primitivos que admite `VaultDocument.fields` de `packages/schema`.
  - Documentación del paquete y de la tarea.
- Fuera:
  - Alertas, comparación con precios públicos y explicación por conceptos (MOD-03).
  - El clasificador de tipo de documento (DOCS-03).
  - Interfaces de subida y de ficha (carril de interfaz, CARPETA-01).
  - Cambios en `packages/schema` y en `apps/web`.
- Invariantes del proyecto que aplican:
  - Sin red: la extracción no hace ni una petición, comprobado con un espía que rechaza.
  - Nada inventado: si un dato no está en el texto, el campo queda a `null` y se declara no leído; el test de precisión cuenta los valores falsos como errores.
  - Fixtures sintéticas: comercializadoras, personas, direcciones, CUPS e importes ficticios. Nunca datos reales.

## Specs

- **S1.** Extraer la comercializadora, el CUPS, el periodo, la potencia contratada, la tarifa, el consumo por periodo y el importe total.
- **S2.** Precisión superior al 90 % sobre 20 facturas sintéticas; si falla un campo, lo marca como no leído.
- **S3.** La entrada es el texto que devuelven `extractPdfText` y `extractImageText`: una línea por línea, sin suponer columnas ni espaciado perfecto, y sin red.
- **S4.** Un campo ausente o ambiguo queda a `null` y aparece en `noLeidos`; un campo con valor nunca aparece en `noLeidos`.
- **S5.** Los valores se normalizan: fechas `AAAA-MM-DD`, importes en euros con número decimal, consumos en kWh, potencias en kW y CUPS en mayúsculas sin espacios ni guiones.
- **S6.** La precisión se mide con los 20 fixtures y su verdad esperada, campo a campo, contando como error tanto un valor ausente que existía como un valor inventado donde no había nada.

## Superficie de edición (nuestra)

`packages/extract/**`, `docs/backlog.md`, `odd/tasks/docs-02-factura.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` en entorno `node`.
- RED: primero el corpus con su verdad, el arnés de precisión y los tests de normalización, viendo fallar el extractor que todavía no existe.

## Riesgo y review (nuestra)

- Tipo: extracción y datos del usuario.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 1 (los campos acaban en el vault cifrado y de ellos salen avisos: un importe inventado es peor que un importe ausente) y elemento 6 (sin un corpus y un umbral, un cambio en el extractor podría degradar la precisión en silencio). La revisión mira: que no se invente nada, que `noLeidos` sea exacto, que el test de precisión mida de verdad y no se pueda ablandar, que no haya red, y que el corpus sea sintético y reproducible.

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] Generador del corpus de 20 facturas y de su verdad esperada, con variantes de formato.
- [x] Tests en rojo: precisión, normalización de valores, campos ausentes y espía de red.
- [x] Implementación del extractor.
- [x] `camposParaVault()` y documentación en el README del paquete.
- [x] Backlog actualizado.
- [x] `pnpm check` y `pnpm e2e` en verde: 64 tests del paquete, resto del monorepo y 84 specs de Playwright.

## Evidencia y progreso

Rama `lg/docs-02-factura`, worktree aparte sobre `dev`.

- API en `packages/extract/src/invoice.ts`: `extractInvoiceFields(texto)` y `camposParaVault(factura)`, más `parsearNumero` y `parsearFecha` exportados porque son las dos normalizaciones con más casos raros y se prueban solas.
- `FacturaLuz` tiene los siete campos de S1 más `noLeidos`, que se calcula a partir de los campos nulos o vacíos en el orden de `CAMPOS_FACTURA`; un campo con valor nunca aparece en la lista.
- Nada inventado: un CUPS que no cumple `ES` + 16 dígitos + 2 letras (más 2 opcionales), una tarifa que no es del tipo `2.0TD`, una fecha imposible o un importe que no es número quedan a `null` y se declaran no leídos.
- Corpus: 20 facturas en `packages/extract/fixtures/facturas/` con su verdad en `verdad.json`, generadas por `scripts/make-invoice-fixtures.mjs` (`pnpm --filter @letra-grande/extract facturas`). Cinco plantillas (etiquetas, fechas `DD/MM/AAAA` o `AAAA-MM-DD`, importes `1.234,56` / `1234.56` / `€ 62,35`), peajes 2.0TD (P1 a P3 de consumo, P1 y P2 de potencia) y 3.0TD (P1 a P6 y P1 a P3), espacios múltiples y CUPS troceado con espacios, y tres facturas a las que les falta a propósito el CUPS, la tarifa o el detalle de potencia. Todo ficticio.
- Precisión medida: **140 de 140 campos** (100 %) sobre los 20 fixtures, con el test fallando por debajo del 90 % como pide S2. Se añadieron dos comprobaciones más estrictas que el umbral: no inventar ningún valor donde la factura no lo trae, y que `noLeidos` coincida exactamente. La segunda es la que cazó un fallo real durante la implementación: seis facturas con la potencia escrita como `Potencia contratada: P1 4,600 kW` se quedaban sin leer mientras la precisión global seguía por encima del 90 %.
- El corpus es una línea base de regresión, no una prueba de precisión sobre facturas reales: está escrito así en el README y en los límites conocidos (etiqueta y valor en la misma línea, solo español, sin desgloses ni datos del titular).
- Tests: 64 en el paquete, todos en verde. Nuevos: 19 de campos y normalización (incluidos `parsearNumero` y `parsearFecha`, que se exportan porque concentran los casos raros) y 5 del corpus y la precisión, con espía sobre `fetch` que rechaza (sin red durante la extracción).

## Siguiente paso

Review gate, PR y merge a `dev`.

## Cambios de alcance aceptados

Ninguno por ahora.
