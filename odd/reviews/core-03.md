# Review gate CORE-03: documentación de arquitectura y modelo de datos

---
tarea: CORE-03
base: 38d09f7
revisado: 1a14f12
revisor: jd-judge-a (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

La documentación es fiel al código en todos los puntos duros. Verificado contra las fuentes: límites del proxy (20 KiB, 4000 caracteres, lector acotado sin `Content-Length`), 422 sin eco del valor detectado, identificador anónimo por hash truncado, tiempo de espera de 30 s, reintento único con solo los errores y `outOfScope` como salida segura, con la ficha de cuota intacta cuando el proveedor falla. Vault: PBKDF2-HMAC-SHA256 con 600 000 iteraciones y sal de 16 bytes, registro versión 2 con el id como `additionalData`, época en importación y purga, `VaultStaleSessionError`, cabecera `LGVX`, tope de 10 000 000 de iteraciones al importar e importación atómica. Contenido: aviso a 180 días, nombre de archivo igual al id, ids únicos por carpeta, `escalation` existente y la regla de verificación completa. Bloques: los seis `kind`, máximo un aviso, pasos correlativos y comparación exacta de cifras. IA: códigos no reintentables, reintentos acotados, circuit breaker que solo cuenta fallos reintentables, cuota con tope y expulsión, guarda de servidor y las dos entradas de `design`. Sin Tailwind, sin grupo de rutas `(app)`, `radar` y `extract` marcados como pendientes. Sin rayas, enlaces resueltos, sin secretos.

## Hallazgos

### 1. [recomendado] docs/ARCHITECTURE.md:56

Problema: la puerta de CI se citaba como `scripts/validate-content.ts`, pero el script vive en `packages/schema/scripts/validate-content.ts` (en la raíz solo hay `check-*.mjs`). Quien lo buscara en `scripts/` no lo encontraría.
Propuesta: ruta completa. Aplicado, mencionando además que se ejecuta con `pnpm content:validate`.

### 2. [recomendado] docs/data-model.md, tabla de la cabecera de copia

Problema: `algorithm` se describía como "2 bytes, código de PBKDF2-HMAC-SHA256". En el código son 2 bytes con la **longitud** del identificador y a continuación esa cantidad de bytes con el texto. Quien implementara el formato desde la tabla produciría archivos incompatibles.
Propuesta: describirlo como longitud más identificador. Aplicado: dos filas, `longitudAlgoritmo` (2 bytes) y `algoritmo` (UTF-8 de esa longitud), con los enteros declarados sin signo y big endian.

### 3. [recomendado] docs/ARCHITECTURE.md:81

Problema: el paso 1 del flujo decía "la interfaz dice cuántos datos se ocultaron", y hoy no hay ninguna llamada a `mask()` en `apps/web`: la página del asistente es un marcador de posición.
Propuesta: marcarlo como comportamiento previsto. Aplicado: el texto dice que `mask()` existe y el contador es de la interfaz del asistente, todavía pendiente.

### 4. [nota] docs/data-model.md:120

Problema: faltaba el tope de doce bloques por respuesta, el único límite del catálogo sin documentar.
Propuesta: una línea. Aplicado.

### 5. [nota] docs/data-model.md:14

Problema: decía que el archivo se llama `<id>.yaml`, y el validador acepta también `.yml`.
Propuesta: mencionarlo. Aplicado, manteniendo que el nombre debe coincidir con el id.

## Olores de documentación

Ninguna contradicción con `AGENTS.md` ni con `ARRANQUE.md`: no se promete verificación automática, asesoramiento jurídico ni telemetría, y `radar` y `extract` figuran como Ola 2. Los hechos con riesgo de deriva (versiones de Next y TypeScript, 600 000 iteraciones, límites de cuota) tienen mecanismo de actualización en la regla 9 de `AGENTS.md` y el documento fecha su última actualización.

Sin secretos incrustados: la única URL del código que aparece es la base pública de NaN, ya documentada.

## Qué se aplicó en la ronda de correcciones

Los cinco hallazgos: la ruta del validador, la codificación real del campo `algorithm` de la cabecera, la promesa de interfaz que todavía no existe, el tope de doce bloques y la extensión `.yml`.
