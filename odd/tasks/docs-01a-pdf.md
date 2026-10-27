# DOCS-01a: extracción de texto de PDF en local

## Objetivo y motivo

La carpeta necesita leer lo que el usuario sube, en el dispositivo y sin red. Esta tarea crea `packages/extract` con la lectura de texto de PDF mediante `pdfjs-dist` y deja fuera, a propósito, el OCR de fotos: los datos de idioma del OCR pesan unos 15 MB y decidir si viajan en el repositorio o se descargan una vez es una decisión de la persona responsable del proyecto.

## Alcance y restricciones

- Dentro: el paquete `packages/extract` con `extractPdfText`, la lectura por páginas, el manejo de PDF sin capa de texto (devuelve texto vacío y lo declara, para que el OCR pueda ocuparse después), los tests con un PDF sintético versionado y la documentación del paquete.
- Fuera: OCR (`DOCS-01b`), extractores de factura (`DOCS-02`), clasificador (`DOCS-03`), las pantallas de subida y la carpeta (carril de interfaz).
- Invariantes del proyecto que aplican: **ninguna petición de red durante la extracción**, comprobado con un espía sobre `fetch`; nada de datos personales en fixtures; sin dependencias que no sean necesarias y con licencia compatible (pdfjs-dist es Apache-2.0).

## Superficie de edición (nuestra)

`packages/extract/**`, `pnpm-lock.yaml`, `docs/backlog.md`, `odd/tasks/docs-01a-pdf.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` en entorno `node`.
- RED: primero los tests contra un PDF sintético, viendo fallar el paquete inexistente.

## Riesgo y review (nuestra)

- Tipo: privacidad y extracción.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 1 (documentos del usuario) y elemento 2 (que la extracción no salga del dispositivo). La revisión mira: que no haya red ni escritura en disco, que el worker qued explicado para el navegador, que un PDF corrupto o cifrado falle con un error claro y no cuelgue, y que la licencia y el peso de la dependencia estén justificados.

## Tareas

- [ ] Paquete `packages/extract` con su `package.json`, `tsconfig.json` y `vitest`.
- [ ] `extractPdfText(bytes, options)`: texto por página, total de páginas y bandera de "sin capa de texto".
- [ ] PDF sintético versionado como fixture, generado a mano sin dependencias.
- [ ] Tests: texto conocido, PDF sin texto, PDF corrupto, y espía de `fetch` en cero.
- [ ] Documentar en el paquete cómo se sirve el worker en el navegador.
- [ ] `pnpm check` en verde.

## Evidencia y progreso

Pendiente de rellenar por quien implementa.

## Siguiente paso

Desbloquea DOCS-02 (extractor de factura de luz) y, cuando se decida el OCR, DOCS-01b.

## Cambios de alcance aceptados

1. La tarea original DOCS-01 incluía OCR. Se separa porque los datos de idioma pesan unos 15 MB y su distribución en el repositorio es una decisión pendiente.
