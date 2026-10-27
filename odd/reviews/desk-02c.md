# Review gate DESK-02c: arranque en Hoy

---
tarea: DESK-02c
base: 8feb6c8
revisado: 5c81a30
revisor: jd-judge-b (contexto limpio, solo lectura, exportación real construida)
veredicto: rechazado
---

## Resumen

La composición de la URL era correcta y no rompía ni el guard de navegación ni el onboarding. El problema estaba en el supuesto de partida: la exportación de Next escribía `hoy.html` plano y no `hoy/index.html`, así que `/hoy/` no encontraba archivo, caía al respaldo y servía el `index.html` de la raíz, que es la landing. El cambio era inoperante en ejecución y los tests pasaban porque solo componían cadenas, sin resolver la URL contra la forma real de la exportación.

## Hallazgos

### 1. [bloqueante] apps/desktop/src/navigation.ts:22 y main.ts:20

Problema: `app://letra-grande/hoy/` resolvía a `fallbackIndex`, es decir, a la portada de la landing, porque en el disco no existía `hoy/index.html`. Comprobado construyendo la exportación.
Propuesta: generar índices de directorio o apuntar a la ruta que existe, con un test que ejercite la forma real. Aplicado: `trailingSlash: true` en el modo escritorio de `apps/web/next.config.ts`, con el motivo escrito en el código.

### 2. [recomendado] apps/desktop/src/app-url.test.ts:206

Problema: ningún test resolvía la URL de arranque contra la exportación, que es justo lo que habría detectado el bloqueante.
Propuesta: añadirlo. Aplicado: un test que resuelve `${APP_ORIGIN}/hoy/` con la forma real de la exportación y exige `directoryIndex: hoy/index.html`.

### 3. [nota] docs/desktop.md:72

Problema: la fila de la tabla afirmaba un comportamiento que todavía no ocurría.
Propuesta: ajustarla al arreglo. Aplicado: la fila menciona `trailingSlash` y por qué hace falta.

### 4. [nota] odd/tasks/desk-02c-arranque.md

Problema: la evidencia afirmaba una resolución comprobada solo contra un simulacro.
Propuesta: corregirla al cerrar. Aplicado: la evidencia cuenta el rechazo, la causa y la corrección.

## Qué se aplicó en la ronda de correcciones

Los cuatro hallazgos, más un guard en CI que comprueba, después de construir la exportación de escritorio, que existen `index.html` y `hoy/index.html`. Así una regresión de configuración que devuelva la exportación a `ruta.html` falla en el pull request en lugar de descubrirse al abrir el instalador.
