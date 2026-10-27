# Review gate DESK-02c: arranque de la app instalada en Hoy

---
tarea: DESK-02c
base: 8feb6c8
revisado: 8942705
revisor: jd-judge-a (contexto limpio, solo lectura, builds y tests ejecutados)
veredicto: aprobado
---

## Segunda ronda

La primera review rechazó la versión inicial por un motivo de fondo: la exportación de Next escribía `hoy.html` plano, así que `app://letra-grande/hoy/` no encontraba archivo, caía al respaldo y servía el `index.html` de la raíz, que es la landing. El cambio de ruta era inoperante y los tests pasaban porque solo componían cadenas. Esta ronda añade `trailingSlash: true` en el modo escritorio, un test que resuelve la URL de arranque con la forma real de la exportación y un guard en CI sobre los dos índices, y está verificado contra el disco.

## Verificado

La exportación de escritorio genera `hoy/index.html` con el contenido de Hoy y mantiene `index.html` en la raíz; la web no cambia, sigue sin `trailingSlash` y conserva `/api/assistant` dinámica. La resolución de `app://letra-grande/hoy/` da `directoryIndex: hoy/index.html`, no el respaldo, y `main.ts` usa `startUrl()` sin restos de la ruta anterior. El guard de CI corre en el mismo job, después de construir la exportación, y cubre exactamente los dos archivos que importan. Las barras finales no rompen nada: `href="/hoy"` sin barra resuelve igual, el guard de navegación compara solo origen, el manifiesto no lo consume el escritorio y la web no usa la opción. El onboarding sigue corriendo: `/hoy` vive en el grupo cuyo layout monta `GateOnboarding`. Cero dependencias nuevas, español correcto, sin rayas, sin secretos, y `apps/web` solo cambia dentro de la rama de escritorio.

## Hallazgos

### 1. [recomendado] apps/desktop/src/app-url.test.ts:205-216

Problema: el test de resolución usa un simulacro que codifica a mano los dos caminos que afirma, así que revertir `trailingSlash` deja la suite local en verde; la detección real vive en CI, y `pnpm check` corre antes de construir la exportación, así que un test de disco rompería ese orden.
Propuesta: dejar escrito el límite de cobertura. Aplicado: un comentario en el test que dice que la forma real la comprueba CI después de construir.

### 2. [nota] apps/web/src/components/shell/ServiceWorkerRegistrar.tsx:11

Problema: falta la puerta de escritorio que promete la sección 5 de `desktop.md`; en `app://` el registro falla y se traga el error, así que no interfiere con el arranque, pero la promesa no está cumplida.
Propuesta: tarea propia. Aplicado: `DESK-02d` en el backlog.

## Qué se aplicó en la ronda de correcciones

Los dos hallazgos: el comentario de cobertura y la tarea registrada. El bloqueante de la primera ronda queda resuelto y verificado contra la exportación real.
