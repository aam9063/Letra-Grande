# Review gate VAULT-02: copia cifrada, importación y borrado total

---
tarea: VAULT-02
base: 9f41a86
revisado: 5b7c1d0
revisor: jd-judge-b (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

La cabecera del artefacto es solo técnica: firma, versión, algoritmo, iteraciones, sal e IV, sin nombres de colección, ids, recuentos ni datos de contenido, y un test lo comprueba buscándolos. La cabecera completa va como `additionalData` de GCM, así que modificarla produce un fallo y nunca una ruta de clave "válida" con datos ajenos. La importación valida y descifra todo antes de abrir escritura y luego hace una única transacción; un aborto de IndexedDB deja el almacén anterior intacto. `replace` no se puede eludir desde la API. La purga limpia las cinco colecciones en una transacción y el test lee recuentos en crudo reabriendo la base, no vía API. Sin dependencias nuevas, sin red, sin secretos, sin `any`, comentarios en español, sin rayas. El cambio de contrato de `list()` no rompe consumidores porque todavía no hay ninguno.

## Hallazgos

### 1. [bloqueante] packages/vault/src/backup.ts:278-312 y vault.ts:341-349

Problema: una sesión viva conservaba la clave vieja después de `importVault({ replace: true })` o de una purga hecha desde otra instancia o pestaña. En el flujo previsto de la carpeta eso significaba escribir registros con la clave antigua mientras `meta` guardaba la sal nueva: ilegibles al reabrir, pérdida irreversible.
Propuesta: época en `meta` y comprobación por sesión, además de invalidación en proceso de las sesiones de la misma base. Aplicado: `epoch` en `meta`, incrementado por importación y purga; cada sesión guarda la época con la que abrió; `get`, `put`, `delete`, `list`, `exportBackup` y `purge` la comprueban y lanzan `VaultStaleSessionError`; el registro en proceso bloquea al instante las demás sesiones de la misma base.

### 2. [recomendado] packages/vault/src/backup.ts:175-180

Problema: las iteraciones del contenedor solo se validaban como positivas, así que un archivo con firma válida podía pedir cuatro mil millones de iteraciones y congelar la pestaña antes de fallar.
Propuesta: cota máxima. Aplicado: 10 000 000, rechazado antes de derivar con error tipado.

### 3. [recomendado] packages/vault/test/backup.test.ts

Problema: no había test de manipulación de cabecera, así que una regresión que dejara la cabecera fuera del `additionalData` no se detectaría.
Propuesta: tests de sal y de iteraciones alteradas. Aplicado: ambos fallan como deben y quedan como anclaje.

### 4. [nota] packages/vault/src/db.ts:29-33 y backup.ts:312

Problema: un aborto por cuota en la transacción final rechazaba con un `Error` genérico que la interfaz no podía tipar.
Propuesta: envolverlo en la jerarquía del paquete. Aplicado, sin cambiar la atomicidad.

### 5. [nota] backup.ts:279-283, R2 de pestañas, N3 de simulación de aborto, N4 de memoria y el doble cast

Quedan registrados como seguimiento: comprobación entre pestañas con Web Locks, test de aborto simulado, nota de memoria con blobs grandes y el tipo puente del `payload`. No se ejecutan en esta tarea.

## Qué se aplicó en la ronda de correcciones

El bloqueante y los dos recomendados, más el tipado del aborto. Resultado: 42 tests del paquete en verde y `pnpm check` limpio. La purga conserva un único registro técnico en `meta` (la época), sin ningún dato personal: es la forma de que la época sea monótona y no quede una ventana de resurrección.
