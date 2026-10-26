# Review gate VAULT-01: almacén local cifrado

---
tarea: VAULT-01
base: 543f15a
revisado: 416c8d4
revisor: jd-judge-b (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

Derivación correcta y probada de verdad: el test abre el almacén sin inyectar iteraciones y comprueba que son 600 000, no solo que la constante existe. Sal de 16 bytes aleatorios por almacén, longitud revalidada al leer, y `extractable: false` probado. IV nuevo de 12 bytes por registro, sin ninguna ruta que lo reutilice ni lo derive de datos. Un registro manipulado lanza `VaultCorruptError`, una contraseña errónea lanza `WrongPasswordError` sin escribir nada (los datos y los parámetros quedan intactos), y un registro de otro almacén no descifra. `lock()` pone la clave a `null` y cierra IndexedDB: no es una bandera, las llamadas posteriores lanzan `VaultLockedError`. Metadatos en un solo `put`, cinco colecciones creadas en `onupgradeneeded`. Tests de comportamiento, incluido que lo escrito no se ve en claro en la base bruta. Sin red, sin `console`, sin `any`, datos ficticios, sin rayas.

## Hallazgos

### 1. [recomendado] packages/vault/src/vault.ts:172-181

Problema: `get()` no reprogramaba el bloqueo por inactividad, aunque `put`, `delete`, `list` y `touch` sí. Leer documentos durante cinco minutos bloqueaba la sesión a mitad de lectura.
Propuesta: reprogramar en `get` y en `list` antes de descifrar. Aplicado con test.

### 2. [recomendado] packages/vault/src/crypto.ts:68-76 y vault.ts:186-196

Problema: GCM sin `additionalData`, así que el id no quedaba autenticado: intercambiar dos registros del mismo almacén descifraba y atribuía el dato al id equivocado sin error.
Propuesta: pasar el id como `additionalData` al cifrar y al descifrar. Aplicado, con subida de versión de registro a 2 y test que intercambia dos registros.

### 3. [recomendado] packages/vault/src/vault.ts:269-271

Problema: `params.algorithm` se validaba después de derivar, así que un almacén de una versión futura con otro KDF decía "contraseña incorrecta" en lugar de "parámetros no compatibles", justo en la migración que el diseño prepara.
Propuesta: validar algoritmo e iteraciones antes de derivar, con error propio. Aplicado.

### 4. [nota] packages/vault/test/vault.test.ts:163, 178

Problema: los tests de contraseña errónea y de bloqueo usaban `rejects.toThrow()` genérico.
Propuesta: afirmar la clase concreta. Aplicado en los cuatro casos.

### 5. [nota] packages/vault/src/vault.ts:224-230

Problema: `list()` usa `Promise.all`, así que un solo registro dañado deja inaccesible el listado completo sin decir cuál.
Propuesta: decidir en VAULT-02 entre documentar el límite o devolver errores por registro. Registrado en el documento de VAULT-02.

### 6. [nota] packages/vault/src/vault.ts:262-266

Problema: si el verificador falta o está corrupto, el `catch` genérico lo convertía en `WrongPasswordError`, engañoso.
Propuesta: distinguir metadatos corruptos. Aplicado con `VaultCorruptMetaError` y test.

### 7. [nota] packages/vault/src/vault.ts:250-275

Problema: dos `openVault` simultáneos sobre un almacén vacío pueden escribir metadatos distintos y dejar registros ilegibles.
Propuesta: escritura condicional. Poco probable en una PWA de una pestaña; registrado en el documento de VAULT-02.

### 8. [nota] olor de código: `StoredRecord` redeclaraba `version` y `RECORD_VERSION` solo se escribía

Propuesta: leer y validar la versión al descifrar. Aplicado con `VaultRecordVersionError` y test.

## Qué se aplicó en la ronda de correcciones

Hallazgos 1, 2, 3, 4, 6 y 8 aplicados; 5 y 7 quedan anotados en `odd/tasks/vault-02.md` para su tarea. Resultado: 21 tests en verde, `typecheck` limpio y `pnpm check` en verde.
