# Review gate DESK-00: decisión y plan del escritorio con Electron

---
tarea: DESK-00
base: efa3224
revisado: ec4bccd
revisor: jd-judge-a (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

La regla de la clave se sostiene sin excepciones: nada en el documento permite llevar la clave de IA en el binario ni en una variable `NEXT_PUBLIC_*`, y la consecuencia de que el asistente necesita red está escrita donde la leería tanto quien mantiene como quien usa la app. No contradice las garantías del proyecto: la PWA ya necesita red para el asistente. La afirmación técnica sobre el build es correcta: la ruta del asistente declara runtime Node y una exportación estática no admite manejadores de ruta, así que las dos salidas son trabajo aparte; no hay middleware en la app y el registro del service worker queda cubierto por el documento. El razonamiento sobre `file://` se sostiene: es un origen opaco por especificación y el protocolo propio es la solución estándar en Electron, con el matiz de que `crypto.subtle` sí funciona ahí y lo poco fiable es la persistencia de IndexedDB. Los datos de macOS son correctos y actuales. Las dependencias entre tareas son coherentes y los criterios verificables.

## Hallazgos

### 1. [bloqueante] docs/desktop.md:3 y odd/tasks/desk-00-decision.md:22

Problema: la decisión y la tarea citaban la fila D-11 del documento de arranque como entregable hecho, pero el documento no se había tocado y esa fila no existía. La única coincidencia del texto era `MOD-11`, que contiene la cadena pero no es la decisión. Un lector llegaba a una referencia rota y el checklist de la tarea mentía.
Propuesta: añadir la fila en este mismo PR. Aplicado: D-11 está en la tabla de decisiones abiertas, con la decisión y el puntero al documento de escritorio.

### 2. [recomendado] docs/desktop.md, sección 4

Problema: faltaban dos reglas de seguridad relevantes para una app que guarda documentos personales. Sin gestor de permisos, una página comprometida puede pedir cámara, micrófono, ubicación o notificaciones. Y la firma del paquete no protege del secuestro del canal de actualización: un feed falsificado puede servir un binario firmado por otro.
Propuesta: añadir ambas. Aplicado: permisos denegados por defecto con `setPermissionRequestHandler` y `setPermissionCheckHandler`, y canal de actualización con URL fija por HTTPS, firma exigida también en el manifiesto y certificado en el gestor de secretos del CI.

### 3. [recomendado] docs/desktop.md, sección 8 (Linux)

Problema: decía que el actualizador automático no está soportado en Linux, y eso es inexacto: el módulo `autoUpdater` de Electron no lo soporta, pero `electron-updater` sí funciona para AppImage; solo el `.deb` requiere gestor de paquetes o descarga.
Propuesta: corregirlo. Aplicado: la limitación queda atribuida al módulo y se distingue AppImage de `.deb`.

### 4. [nota] docs/desktop.md, sección 6.1

Problema: el texto dejaba abierto quitar el `webpack` personalizado "si la exportación lo permite", condición que nunca se dará: `extensionAlias` sigue haciendo falta para los paquetes del workspace en TypeScript fuente.
Propuesta: decirlo. Aplicado: el `webpack` de `extensionAlias` se mantiene en las dos salidas.

### 5. [nota] docs/desktop.md, sección 5

Problema: "detectado por una variable inyectada en el protocolo" era vago.
Propuesta: nombrar el mecanismo. Aplicado: constante de build (`import.meta.env.DESKTOP`) fijada por `next build` para la salida de escritorio y vacía en la web, sin depender de `process`, que es lo que `sandbox` elimina del renderer.

## Olores de documentación

La referencia a una decisión inexistente era el único grave y está corregido. Sin rayas largas ni medias, español correcto.

## Secretos

Ninguno: el diff no contiene claves, `NEXT_PUBLIC_*` ni URLs con tokens.

## Qué se aplicó en la ronda de correcciones

Los cinco hallazgos, en una sola ronda. La decisión queda completa, con la fila D-11 real y el plan de seguridad del envoltorio endurecido.
