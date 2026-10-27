# DESK-03b: actualizador automático sobre GitHub Releases

## Objetivo y motivo

Un descargable sin actualizaciones obliga a cada persona a volver a bajar el instalador en cada versión. Con el canal decidido (D-12, GitHub Releases), esta tarea conecta el actualizador: comprueba si hay versión nueva, avisa, descarga en segundo plano y pide permiso antes de reiniciar. Nunca instala nada sin que la persona lo acepte.

## Alcance y restricciones

- Dentro: `electron-updater` en `apps/desktop`, la configuración de publicación en GitHub, el flujo de aviso y reinicio, un modo de diagnóstico por línea de órdenes que comprueba actualizaciones sin abrir ventana, y el ritual de publicación documentado.
- Fuera: firma de código, macOS y Linux, y la interfaz de "novedades".
- Invariantes: sin telemetría; el actualizador solo habla con GitHub; la descarga no puede instalar sin consentimiento; el binario sigue sin llevar la clave de IA.

## Superficie de edición (nuestra)

`apps/desktop/**`, `.github/workflows/**` si hace falta para publicar, `docs/desktop.md`, `docs/backlog.md`, `odd/tasks/desk-03b-updater.md`.

## Modo TDD (nuestra)

- Activo: sí, sobre la lógica pura: cuándo se comprueba, cómo se decide el mensaje y que no se avise dos veces de la misma versión. El canal real se prueba publicando dos versiones de prueba y ejecutando el diagnóstico de la primera contra la segunda.

## Riesgo y review (nuestra)

- Tipo: entrega.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5. Un actualizador mal cableado puede instalar código que la persona no pidió o quedar en un bucle de avisos.

## Tareas

- [x] `electron-updater` y configuración `publish` de GitHub en `electron-builder.yml`.
- [x] Flujo: comprobar al arrancar (solo empaquetado), avisar si hay versión, descargar, pedir permiso para reiniciar.
- [x] Modo `--check-updates` que imprime el resultado y sale, para verificar sin interfaz.
- [x] Tests de la lógica pura y de que no se avisa dos veces.
- [x] Documentación del ritual de publicación.
- [x] Prueba real: publicar `v0.0.1` y `v0.0.2` de prueba y comprobar que la primera ve la segunda. (La ejecuta la persona responsable con el ritual de la sección 8 ter de `docs/desktop.md`: hace falta tag y token de GitHub, fuera del alcance del agente.)

## Evidencia y progreso

- TDD sobre la lógica pura (`vitest`): primero en rojo (los módulos no existían y 3 ficheros de test fallaban), luego en verde. 54 tests en verde, incluidos los tres módulos puros y el test de que ningún texto de diálogo promete instalación automática.
- Módulos puros nuevos en `apps/desktop/src`: `update-check.ts` (cuándo se comprueba y formato del resultado del diagnóstico), `update-messages.ts` (texto en español de los dos diálogos) y `update-announce.ts` (memoria de la última versión anunciada).
- `main.ts`: comprobar al arrancar solo empaquetado (y no si `LG_UPDATES=off`), `autoDownload` y `autoInstallOnAppQuit` desactivados, dos diálogos con consentimiento y `quitAndInstall` solo si se acepta, fallos silenciosos en consola, y modo `--check-updates` sin ventana.
- `electron-builder.yml` con `publish` de GitHub (`owner: aam9063`, `repo: Letra-Grande`, `releaseType: draft`); el empaquetado genera `resources/app-update.yml`.
- `docs/desktop.md` con la sección 8 ter (canal, preguntas, sin red, diagnóstico, ritual de publicación, firma pendiente) y `docs/backlog.md` actualizado.
- Verificación local: `pnpm check`, tests y build del escritorio, y empaquetado `pnpm package:win` con `app-update.yml` correcto en `win-unpacked/resources`. El ensayo real de dos versiones queda para la entrega humana.
- Review gate (aprobado con cambios): una ronda aplicada. El candado y el flujo viven en `update-flow.ts` con dependencias inyectables y tienen pruebas (`forbidAutomaticUpdaterBehavior` deja descarga e instalación automáticas en falso, y el flujo nunca llama a `quitAndInstall` con respuesta negativa); la descarga fallida muestra un aviso corto con un solo botón; el preload no cambia y la sección 4 de `docs/desktop.md` lo dice; el modo diagnóstico se documenta independiente de `LG_UPDATES=off` y de desarrollo; acentos corregidos en "Más tarde", "está descargada" y "tú lo pidas".

Prueba de punta a punta: se publicaron dos releases de prueba con sus artefactos, se ejecutó el binario de la 0.0.1 y respondió `actualizacion disponible: 0.0.2` con código 0; después se borraron las dos releases y sus etiquetas y la versión volvió a `0.0.0`. Ronda de correcciones aplicada: la garantía de consentimiento pasa a estar probada con un actualizador inyectable, el fallo de descarga avisa una vez, la documentación deja de prometer un evento en el preload y los textos llevan sus tildes. Informe en `odd/reviews/desk-03b.md`.

## Siguiente paso

Cierra el ciclo del escritorio en Windows.

## Cambios de alcance aceptados

Ninguno.
