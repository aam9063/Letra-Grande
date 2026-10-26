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

- [x] T1: tests de ida y vuelta completa y de purga (RED).
- [x] T2: exportación cifrada con versión de formato y sin metadatos legibles.
- [x] T3: importación atómica con validación previa y error claro.
- [x] T4: purga completa de las cinco colecciones y de los blobs asociados.
- [x] T5: `pnpm check` en verde.

## Evidencia y progreso

- RED: quince tests fallando antes de implementar (el módulo de copia no cargaba, `list()` lanzaba con un registro dañado y dos aperturas simultáneas guardaban sales distintas: carrera reproducida).
- GREEN: 36 de 36 tests del paquete en tres ficheros; `pnpm check` en la raíz en verde.
- Artefacto de exportación: binario. Cabecera en claro con datos solo técnicos (firma `LGVX`, versión de formato, algoritmo e iteraciones de PBKDF2 y sal), IV de 12 bytes y carga cifrada con AES-256-GCM usando la cabecera completa como `additionalData`. La carga es el JSON de las cinco colecciones y sus ids. Un test busca apellidos ficticios, nombres de colección e ids dentro del artefacto y no encuentra nada.
- Importación: se rechaza con `VaultNotEmptyError` si hay registros, salvo `replace: true`; con una copia de la misma contraseña se reinician metadatos y se recifra todo. Atomicidad: validación y descifrado completos en memoria antes de abrir escritura, y luego una única transacción que limpia las cinco colecciones y `meta` e inserta; cualquier fallo no toca nada.
- Borrado total: tras `purge()` los recuentos en crudo de las cinco colecciones y de `meta` son cero, la sesión queda bloqueada y la reapertura lista vacío.
- Hallazgos heredados de VAULT-01: `list()` devuelve `{ values, errors }` con el error tipado por registro dañado, y `openVault` se serializa por nombre de base, de modo que dos aperturas concurrentes acuerdan los mismos parámetros.

Ronda de correcciones aplicada: época en `meta` y `VaultStaleSessionError` para que una sesión vieja no escriba con la clave antigua tras importar o borrar, límite de 10 000 000 de iteraciones al importar, tests de cabecera manipulada y aborto de transacción tipado. La purga conserva un único registro técnico en `meta` (la época), sin datos personales. Informe en `odd/reviews/vault-02.md`.

## Siguiente paso

Desbloquea la interfaz de copia de seguridad en la carpeta.

## Cambios de alcance aceptados

Ninguno.
