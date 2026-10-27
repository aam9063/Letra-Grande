# DESK-02: ventana Electron con protocolo propio

## Objetivo y motivo

DESK-01 ya produce el renderer estático. Falta la aplicación que lo abre: una ventana Electron endurecida que sirva el renderer por un protocolo propio, bloquee la navegación y exponga al renderer solo lo imprescindible. Sin esta tarea el escritorio no existe; con ella hay un binario que se puede abrir y probar.

## Alcance y restricciones

- Dentro: `apps/desktop` con el proceso principal, el `preload`, el protocolo `app://`, el manejador de permisos, el bloqueo de navegación y ventanas, la instancia única, los scripts de compilación y arranque, y pruebas unitarias de las funciones puras (resolución de rutas y guardas de navegación).
- Fuera: el instalador y el actualizador (DESK-03), macOS y Linux (DESK-04), cualquier cambio en `apps/web`, y la carpeta real para la copia cifrada (lo hace la interfaz en una tarea posterior).
- Invariantes del proyecto que aplican: el binario no lleva ninguna clave; sin telemetría ni terceros; el renderer no tiene acceso a Node; el service worker no se registra en modo escritorio; permisos denegados por defecto.

## Superficie de edición (nuestra)

`apps/desktop/**`, `pnpm-workspace.yaml` si hiciera falta, `pnpm-lock.yaml`, `docs/review-gate.md`, `odd/tasks/desk-02-window.md`.

## Modo TDD (nuestra)

- Activo: parcialmente. Las funciones puras (resolver una URL `app://` a un archivo del renderer, decidir si una navegación está permitida, decidir si un permiso se concede) llevan tests con `vitest` antes de implementarse. El arranque de Electron no se puede probar de forma determinista en CI, así que su verificación es una ejecución manual documentada.
- Runner: `vitest` en `apps/desktop`.

## Riesgo y review (nuestra)

- Tipo: seguridad del envoltorio.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 2 (la ventana abre documentos personales dentro de un proceso privilegiado) y elemento 5 (nuevas dependencias de empaquetado). La revisión mira: aislamiento de contexto, superficie del preload, resolución de rutas sin salir del directorio del renderer, y que ninguna navegación externa pueda quedarse dentro de la ventana.

## Tareas

- [ ] `apps/desktop` como paquete del workspace, con sus dependencias de desarrollo declaradas.
- [ ] Protocolo `app://letra-grande` que sirve `apps/web/dist-desktop`, con protección contra rutas que salgan del directorio.
- [ ] Ventana con `contextIsolation`, `sandbox`, `nodeIntegration` desactivado, preload mínimo y CSP.
- [ ] Guardas: navegación fuera del origen bloqueada, ventanas nuevas al navegador del sistema, permisos denegados por defecto, instancia única.
- [ ] Scripts `build` y `start`, y tests de las funciones puras.
- [ ] Nota en `docs/review-gate.md` con las dos trampas del gate: marcar listo cuando ya aparezca el run del push, y actualizar la rama antes de mergear por `strict`.

## Evidencia y progreso

Pendiente de rellenar por quien implementa.

## Siguiente paso

Desbloquea DESK-03 (instalador NSIS y actualizador).

## Cambios de alcance aceptados

Ninguno.
