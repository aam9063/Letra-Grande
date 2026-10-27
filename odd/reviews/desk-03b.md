# Review gate DESK-03b: actualizador automático

---
tarea: DESK-03b
base: 539361b
revisado: 8b41d2e
revisor: jd-judge-a (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

Ninguna ruta instala sin consentimiento: `autoDownload` y `autoInstallOnAppQuit` van en falso, y `quitAndInstall` solo se llama cuando la respuesta del diálogo es afirmativa; si la persona cierra el diálogo o sale a mitad de descarga, no se instala nada. La comprobación exige estar empaquetado y respeta `LG_UPDATES=off`, y el diagnóstico imprime una línea y sale sin abrir ventana, con código 0 cuando hay o no hay versión y 1 cuando falla. La guarda de anuncios no repite la misma versión y se reinicia con una nueva. El único origen es el `publish` de GitHub: no hay `setFeedURL` ni `feedURL` en el código, y el token solo aparece en el ritual como variable de entorno. El paquete genera `app-update.yml` correcto y la documentación describe lo que el código hace, incluido el aviso de SmartScreen al no estar firmado.

## Hallazgos

### 1. [recomendado] apps/desktop/src/main.ts:47-54 y 72-98

Problema: la garantía central, "nada se instala sin consentimiento", estaba fijada solo por inspección. Una regresión que devolviera `autoDownload` a verdadero o llamara a `quitAndInstall` fuera del diálogo no habría roto ningún test.
Propuesta: hacerla comprobable. Aplicado: la lógica se extrajo a `update-flow.ts` con el actualizador y los diálogos inyectables, y hay tests que prueban el candado, que aplicarlo dos veces no lo afloja, que una respuesta negativa no descarga ni instala, que la negativa al reiniciar no instala nunca, que la afirmativa sí instala, que la descarga se pide al aceptar, que no se pregunta dos veces por la misma versión y que el canal se comprueba una vez al arrancar.

### 2. [recomendado] apps/desktop/src/main.ts:84-87

Problema: si la persona aceptaba descargar y la descarga fallaba, el error se tragaba sin señal y sin segunda comprobación.
Propuesta: un aviso breve, una sola vez, sin reintentos. Aplicado, con su test.

### 3. [recomendado] docs/desktop.md:59

Problema: la sección 4 prometía que el preload expondría un evento de actualización con esta tarea, y no ocurrió: los avisos son diálogos nativos del proceso principal.
Propuesta: corregirlo. Aplicado.

### 4. [nota] Diagnóstico

`--check-updates` ignora `LG_UPDATES=off` y corre también en desarrollo, donde electron-updater no comprueba y se imprime `sin actualizaciones`. Documentado en la sección 8 ter.

### 5. [nota] Tildes

Faltaban en tres textos de los diálogos. Aplicado.

## Olores de código

`diagnosticUpdateCheck` duplicaba el candado y la comparación de versiones; ahora comparte el módulo puro.

## Secretos

Ninguno. `owner` y `repo` son identificadores públicos; el token solo aparece en el ritual como variable de entorno.

## Prueba de punta a punta

Publicadas dos releases de prueba, `v0.0.1` y `v0.0.2`, con el `.exe`, el `.blockmap` y el `latest.yml` de cada una, y ejecutado el binario de la primera: imprimió `actualizacion disponible: 0.0.2` con código 0. Las dos releases y sus etiquetas se borraron al terminar y la versión del paquete volvió a `0.0.0`. El canal queda verificado, no supuesto.

## Qué se aplicó en la ronda de correcciones

Los tres hallazgos accionables y las dos notas. Resultado: 66 tests en `apps/desktop` y `pnpm check` en verde.
