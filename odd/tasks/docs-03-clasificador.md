# DOCS-03: clasificador de tipo de documento

## Objetivo y motivo

La carpeta necesita saber qué acaba de entrar: no es lo mismo una factura, que un contrato, que una multa. El tipo decide qué se le enseña a la persona y qué módulo lo explica (MOD-03 para la factura, MOD-05 para multas y cartas, MOD-08 para contratos, MOD-10 para pólizas). El texto ya se lee en local (DOCS-01a, DOCS-01b) y la factura ya se entiende (DOCS-02); falta decir de qué documento se trata.

## Alcance y restricciones

- Dentro:
  - `packages/extract/src/classify.ts`: `classifyDocument(texto)` devuelve uno de los seis tipos del esquema (`factura`, `contrato`, `carta_oficial`, `multa`, `ticket`, `poliza`) o `otro`, con la confianza y las señales que han decidido.
  - Lógica pura sobre texto: sin red, sin ficheros, sin estado global y determinista.
  - Sin evidencia suficiente o con dos tipos empatados, la respuesta es `otro`: es preferible no clasificar a clasificar mal, porque el tipo decide qué se le muestra a la persona.
  - Conjunto sintético de documentos de los seis tipos, generado por un script reproducible, y un test de precisión que falla por debajo del 85 %.
  - Documentación del paquete y de la tarea.
- Fuera:
  - Explicar el contenido de cada tipo (MOD-03, MOD-05, MOD-08, MOD-10).
  - La detección de plazos a partir del documento (RADAR-02 y los módulos de arriba).
  - El etiquetado manual en la interfaz (CARPETA-01).
  - Cambios en `packages/schema`: el tipo se consume, no se cambia.
- Invariantes del proyecto que aplican:
  - Sin red.
  - Nada inventado: `otro` cuando no hay evidencia, y la confianza lo refleja.
  - Fixtures sintéticas: organismos, empresas, personas e importes ficticios. Nunca datos reales.
  - Los tipos son los del contrato común (`DocumentKind` de `packages/schema`), sin una copia que pueda desviarse.

## Specs

- **S1.** Clasificar un documento en `factura`, `contrato`, `carta_oficial`, `multa`, `ticket` o `poliza`, con `otro` cuando no hay evidencia suficiente.
- **S2.** Precisión superior al 85 % en el conjunto sintético.
- **S3.** La entrada es el texto que devuelven `extractPdfText` y `extractImageText`: línea por línea, sin red y sin suponer maquetación.
- **S4.** Sin evidencia, o con dos tipos empatados, la respuesta es `otro`, y se declaran las señales que han decidido (o que no han decidido nada). Nunca se elige un tipo al azar.
- **S5.** La confianza acompaña a la clasificación: `otro` no puede llevar confianza alta, y un tipo con poca evidencia no puede llevar la misma confianza que uno con mucha.
- **S6.** La precisión se mide documento a documento sobre el conjunto sintético, y el conjunto se regenera y se compara para que no se pueda ablandar editando un fixture.

## Superficie de edición (nuestra)

`packages/extract/**`, `packages/extract/package.json` (dependencia de tipo con `@letra-grande/schema`), `pnpm-lock.yaml`, `docs/backlog.md`, `odd/tasks/docs-03-clasificador.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` en entorno `node`.
- RED: primero el conjunto sintético con su verdad, el arnés de precisión y los tests de evidencia, viendo fallar el clasificador que todavía no existe.

## Riesgo y review (nuestra)

- Tipo: extracción y datos del usuario.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 1 (el tipo acaba en el vault y decide qué se le enseña a la persona: una multa tratada como carta, o una carta tratada como multa, lleva a la acción equivocada) y elemento 6 (sin conjunto y umbral, un cambio podría degradar la clasificación en silencio). La revisión mira: que no se clasifique sin evidencia, que el empate sea `otro`, que las señales sean auditables, que no haya red y que el conjunto no se pueda ablandar.

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] Generador del conjunto sintético y de su verdad, con variantes por tipo.
- [x] Tests en rojo: precisión, evidencia, empate, sin red.
- [x] Implementación del clasificador.
- [x] Documentación en el README del paquete.
- [x] Backlog actualizado.
- [x] `pnpm check` y `pnpm e2e` en verde: 87 tests del paquete, resto del monorepo y 84 specs de Playwright.

## Evidencia y progreso

Rama `lg/docs-03-clasificador`, worktree aparte sobre `dev`.

- API en `packages/extract/src/classify.ts`: `classifyDocument(texto)` devuelve `{ kind, confidence, signals }`. `kind` es el `DocumentKind` de `@letra-grande/schema` (dependencia solo de tipo, para que la lista no se desvíe del contrato), así que incluye `otro` sin reescribirlo.
- Evidencia: cada tipo tiene señales con peso. Valen 4 las casi exclusivas (expediente sancionador, importe a ingresar o pago voluntario), 3 las muy propias (CUPS, potencia contratada, boletín de denuncia, prima, asegurado, la palabra contrato o póliza), 2 las compartidas (periodo de facturación, cláusulas, coberturas, IVA incluido, vehículo) y 1 la cortesía formal. Por debajo de 5 puntos, o con empate en cabeza, la respuesta es `otro` con confianza 0 y sin señales.
- Confianza: `100 × margen / (puntos + 5)`, acotada a 0..100. Combina evidencia absoluta y margen sobre el segundo tipo, así que dos señales no puntúan igual que siete.
- Conjunto: 36 documentos (6 por tipo) en `packages/extract/fixtures/documentos/` con su verdad en `verdad.json`, generados por `scripts/make-document-fixtures.mjs` (`pnpm --filter @letra-grande/extract documentos`). Facturas de luz, agua, gas y telefonía; contratos de alquiler, telefonía, suministro, préstamo, mantenimiento y limpieza; cartas de ayuntamiento, consejería, agencia, dirección general, juzgado y ministerio; multas de tráfico, transporte, residuos y ordenanza; tickets de supermercado, gasolinera, farmacia, cafetería, tienda y aparcamiento; pólizas de hogar, coche, vida, salud, viaje y mascota. Todo ficticio y con un pie que lo dice.
- Un documento de cada tipo omite su palabra más característica: una factura sin "factura", un contrato sin "contrato", una carta sin "expediente", una multa sin "denuncia", un ticket sin "ticket" y una póliza sin "póliza".
- Precisión medida: **36 de 36 documentos** (100 %), con confianzas entre 29 y 74, y el test fallando por debajo del 85 % como pide S2. El conjunto se regenera en un temporal y se compara byte a byte, así que no se puede ablandar editando un fixture.
- Dos decisiones de pesos que costaron un fallo real: una multa con "recurso de reposición" puntuaba igual que una carta oficial (7 y 7) y caía en `otro`; se separó "expediente sancionador" e "importe a ingresar" como señales casi exclusivas de 4 puntos, y desde entonces la multa gana con margen. El caso está fijado por un test.
- Review gate (`odd/reviews/docs-03.md`, veredicto aprobado con cambios) y una ronda aplicada: el comentario de pesos corregido y el organismo de `multa-2` renombrado para no imitar a uno real.
- Tests: 87 en el paquete. Nuevos: 13 del clasificador (un texto mínimo por tipo, sin red, texto vacío, empate, multa contra carta, ticket contra factura, confianza creciente con la evidencia, señales legibles, documento muy largo) y 5 del conjunto y la precisión.

## Siguiente paso

Conjunto primero, después el clasificador.

## Cambios de alcance aceptados

Ninguno por ahora.
