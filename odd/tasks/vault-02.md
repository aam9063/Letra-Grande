# VAULT-02: copia cifrada, importación y borrado total

## Objetivo y motivo

Permitir que la persona pueda sacar su carpeta del dispositivo y volver a meterla, y que "borrar todo" borre de verdad. Sin exportación, el local-first se convierte en una trampa: si se pierde el navegador, se pierden los documentos.

## Alcance y restricciones

- Dentro: `packages/vault/src/**` (exportación a un único archivo cifrado, importación con validación e integridad, purga completa de las cinco colecciones) y `packages/vault/test/**`.
- Fuera: interfaz de exportación e importación (CARPETA-01 y la Ola 2), copia de seguridad en la nube (fuera del proyecto), perfiles múltiples (MOD-12).
- Invariantes del proyecto que aplican: el archivo exportado sigue cifrado y sin metadatos legibles; nada sale del dispositivo salvo por decisión explícita de la persona; un archivo corrupto o de otra versión no puede dejar el almacén a medias; sin datos personales reales en tests; sin rayas largas ni medias rayas.

## Superficie de edición (nuestra)

`packages/vault/**`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` con `fake-indexeddb`.
- Fuente de la decisión: `AGENTS.md`.
- RED: exportar, borrar todo e importar devuelve exactamente el mismo contenido (fichas, blobs, radar y ajustes); el archivo exportado no contiene ningún término legible de los documentos; importar un archivo corrupto falla sin tocar el almacén existente; tras borrar todo no queda ningún registro en ninguna colección; importar con contraseña incorrecta falla.

## Riesgo y review (nuestra)

- Tipo: vault y datos personales.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 1 (importación que sobrescribe datos y borrado irreversible). Review centrada en: atomicidad de la importación, validación de versión y formato antes de escribir, que el borrado no deje restos en colaciones ni blobs huérfanos, que el archivo exportado no filtre cabeceras legibles y que la confirmación sea explícita en el código (no un borrado silencioso).

## Hallazgos heredados del review de VAULT-01

1. `list()` usa `Promise.all`: un solo registro dañado deja inaccesible el listado completo sin decir cuál. Decidir aquí entre devolver errores por registro (preferible para la interfaz de la carpeta) o documentar el límite y degradar la lectura.
2. Dos `openVault` simultáneos sobre un almacén vacío pueden escribir metadatos distintos y dejar registros ilegibles. Añadir escritura condicional o un bloqueo de apertura.

## Tareas

- [ ] T1: tests de ida y vuelta completa y de purga (RED).
- [ ] T2: exportación cifrada con versión de formato y sin metadatos legibles.
- [ ] T3: importación atómica con validación previa y error claro.
- [ ] T4: purga completa de las cinco colecciones y de los blobs asociados.
- [ ] T5: `pnpm check` en verde.

## Evidencia y progreso

Pendiente de rellenar por quien implementa: comandos, número de tests y comprobación de que tras borrar no queda nada.

## Siguiente paso

Desbloquea la interfaz de copia de seguridad en la carpeta.

## Cambios de alcance aceptados

Ninguno.
