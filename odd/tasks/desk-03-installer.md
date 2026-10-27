# DESK-03: instalador de Windows y canal de entrega

## Objetivo y motivo

DESK-02 abre el renderer en una ventana endurecida, pero solo desde el árbol de trabajo. Para que una persona pueda descargar y usar la app hace falta un instalador reproducible y saber qué se publica, dónde y con qué aviso. Esta tarea produce el `.exe` de Windows y documenta el canal de entrega.

## Alcance y restricciones

- Dentro: configuración de `electron-builder` para Windows con NSIS, el empaquetado del renderer estático dentro de la aplicación, los scripts de empaquetado, el artefacto ignorado por git, y la documentación del canal de entrega y del aviso de SmartScreen.
- Fuera: la firma de código (necesita un certificado y es una decisión de gasto), el actualizador automático (necesita un servidor de publicaciones: `DESK-03b`) y macOS y Linux (`DESK-04`).
- Invariantes del proyecto que aplican: el binario no lleva la clave de IA; sin telemetría; sin terceros en el renderer; el renderer se sirve por `app://`, también cuando la app está instalada.

## Superficie de edición (nuestra)

`apps/desktop/**`, `.gitignore`, `docs/desktop.md`, `README.md`, `odd/tasks/desk-03-installer.md`.

## Modo TDD (nuestra)

- Activo: parcialmente. La resolución de la raíz del renderer en modo empaquetado (`app.isPackaged`) es lógica pura y lleva tests antes de implementarse: en desarrollo apunta al directorio del repositorio y en la app instalada a los recursos empaquetados. El instalador en sí se verifica generándolo.
- Runner: `vitest` en `apps/desktop`.

## Riesgo y review (nuestra)

- Tipo: entrega y distribución.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5 (un instalador que no arranca, que incluye archivos que no debe o que pierde el renderer) y elemento 2 si el empaquetado dejara accesible algo que no toca. La revisión mira qué entra en el paquete, cómo se resuelve la raíz del renderer, y que el aviso de SmartScreen esté escrito.
- Nota de cadena de suministro: `electron-builder` descarga herramientas al empaquetar; hay que decir qué se descarga y de dónde.

## Tareas

- [x] Configuración de `electron-builder` para Windows: `appId` estable, nombre de producto, objetivo NSIS, directorio de salida y nombre del artefacto.
- [x] Empaquetar el renderer estático dentro de la app y resolver su ruta también cuando está instalada, con tests.
- [x] Script de empaquetado en el paquete y en la raíz; artefactos ignorados por git.
- [x] Verificar que el instalador se genera y que el paquete contiene el renderer y el proceso principal, y nada de desarrollo.
- [x] Documentar el canal de entrega: qué artefacto se publica, con qué nombre y versión, el aviso de SmartScreen sin firma y qué falta para firmar.
- [x] `pnpm check` en verde.

## Evidencia y progreso

- TDD: `apps/desktop/src/renderer-root.test.ts` escrito primero, en rojo por módulo ausente, y en verde tras implementar `renderer-root.ts`: 34 tests en verde. La comprobación de directorio ausente devuelve un mensaje claro con la ruta y `main.ts` lo muestra en diálogo y cierra en vez de servir una app vacía.
- Empaquetado verificado: `pnpm package:win` produce `apps/desktop/release/Letra Grande-0.0.0-x64.exe` (unos 116 MB) y `win-unpacked`. El asar solo lleva `dist` compilado y `package.json` (tests excluidos con `!dist/*.test.js`); el renderer va en `resources/renderer`, fuera del asar. Sin firma (no hay certificado); `electron-builder` descargó el zip de Electron y NSIS desde GitHub.
- Pendiente del review gate (sección 22).

Ronda de correcciones aplicada: la documentación remite a DESK-03b para el actualizador, se documentan las descargas del empaquetado y el comportamiento sin red, y la sobrecarga de la raíz por entorno se ignora en la app empaquetada con dos tests nuevos. Informe en `odd/reviews/desk-03.md`.

## Siguiente paso

Desbloquea `DESK-03b` (actualizador) y `DESK-04` (macOS y Linux).

## Cambios de alcance aceptados

Ninguno.
