# VAULT-01: almacén local cifrado sobre IndexedDB

## Objetivo y motivo

Implementar `@letra-grande/vault`: las colecciones `profiles`, `documents`, `blobs`, `radar` y `settings` sobre IndexedDB, con cifrado AES-256-GCM, IV aleatorio de 12 bytes por registro, clave derivada con PBKDF2-HMAC-SHA256 y 600 000 iteraciones, sal de 16 bytes guardada junto a los parámetros, `CryptoKey` no extraíble que vive solo en memoria y bloqueo automático por inactividad. Es la base de la promesa de privacidad y de la carpeta.

## Alcance y restricciones

- Dentro: `packages/vault/src/**` (apertura y creación del almacén, derivación de clave, cifrado y descifrado por registro, cierre de sesión y bloqueo por inactividad, apertura con contraseña errónea, operaciones de lectura y escritura tipadas con `@letra-grande/schema`) y `packages/vault/test/**`.
- Fuera: exportar e importar la copia cifrada y "borrar todo" (VAULT-02), interfaz de la carpeta (CARPETA-01), extracción de documentos (DOCS-01), perfiles múltiples (MOD-12).
- Invariantes del proyecto que aplican: ningún dato personal sale del dispositivo (nada de red en este paquete); la clave no es extraíble; los parámetros de derivación se guardan junto al registro cifrado para poder migrarlos; los datos personales de los tests son ficticios; sin rayas largas ni medias rayas.

## Superficie de edición (nuestra)

`packages/vault/**`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` con `fake-indexeddb`.
- Fuente de la decisión: `AGENTS.md`.
- RED: guardar y recuperar una ficha y un blob devuelve exactamente lo guardado; abrir con contraseña errónea falla sin tocar datos; la `CryptoKey` no es extraíble; un registro manipulado en el almacén no se descifra (la autenticación de GCM lo detecta); el bloqueo por inactividad exige la contraseña otra vez.

## Riesgo y review (nuestra)

- Tipo: vault y datos personales.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 1 (datos cifrados, pérdida o corrupción irreversible) y elemento 2 (seguridad y privacidad). Review centrada en: generación y no reutilización de IV, derivación de clave, ausencia de fugas por logs o mensajes de error, que la clave no se pueda exportar ni serializar, comportamiento del bloqueo por inactividad y compatibilidad de parámetros para migraciones.

## Tareas

- [x] T1: tests de apertura, cifrado y descifrado con `fake-indexeddb` (RED).
- [x] T2: derivación de clave (PBKDF2 600 000, sal de 16 bytes, parámetros persistidos) y `CryptoKey` no extraíble.
- [x] T3: cifrado AES-256-GCM por registro con IV de 12 bytes y autenticación comprobada.
- [x] T4: colecciones tipadas, cierre de sesión y bloqueo por inactividad.
- [x] T5: `--passWithNoTests` eliminado y `pnpm check` en verde.

## Evidencia y progreso

- RED: dos ficheros de test fallando con `Cannot find module '../src/vault.js'`.
- GREEN: 16 de 16 tests.
- La clave se deriva con `extractable: false` y el test afirma que no es extraíble y que `JSON.stringify` devuelve un objeto vacío; nunca se persiste ni se serializa, vive solo en la instancia en memoria.
- Bloqueo por inactividad con un temporizador inyectable (por defecto `setTimeout`), reprogramado en cada operación y en `touch()`; al dispararse descarta la clave, cierra IndexedDB y avisa por `onLock`.
- Contraseña errónea: se descifra un verificador en `meta` y se lanza `WrongPasswordError` sin escribir nada; el test comprueba que los datos y los parámetros de derivación quedan intactos.
- Registro manipulado: el test altera un byte del ciphertext en IndexedDB y el descifrado falla con `VaultCorruptError` en vez de devolver basura.
- Las 600.000 iteraciones de PBKDF2 son el valor por defecto y el test lo afirma; en los tests se inyecta un valor bajo para no hacer la suite inusable.
- `pnpm check` en la raíz en verde.

## Siguiente paso

Desbloquea VAULT-02 y CARPETA-01.

## Cambios de alcance aceptados

Ninguno.
