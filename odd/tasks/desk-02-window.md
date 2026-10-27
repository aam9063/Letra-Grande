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

- [x] `apps/desktop` como paquete del workspace, con sus dependencias de desarrollo declaradas.
- [x] Protocolo `app://letra-grande` que sirve `apps/web/dist-desktop`, con protección contra rutas que salgan del directorio.
- [x] Ventana con `contextIsolation`, `sandbox`, `nodeIntegration` desactivado, preload mínimo y CSP.
- [x] Guardas: navegación fuera del origen bloqueada, ventanas nuevas al navegador del sistema, permisos denegados por defecto, instancia única.
- [x] Scripts `build` y `start`, y tests de las funciones puras.
- [x] Nota en `docs/review-gate.md` con las dos trampas del gate: marcar listo cuando ya aparezca el run del push, y actualizar la rama antes de mergear por `strict`.

## Evidencia y progreso

Implementado en la rama `lg/desk-02-window`.

- Tests (vitest, `apps/desktop`): 24 pruebas de las funciones puras, todas en verde. RED capturado: la primera ejecución falló porque los módulos no existían, y una segunda tanda falló antes de implementar la CSP con hashes.
- `pnpm --filter @letra-grande/desktop build`: compila con TypeScript 7 estricto (ESM en `dist/main.js`, el preload se compila a `dist/preload.cjs` porque un preload con sandbox no puede ser ESM).
- `pnpm --filter @letra-grande/desktop test`: 24/24 en verde.
- `pnpm check` en la raíz: verde (estilo, typecheck, tests de todos los paquetes y contenido).
- Ejecución manual en Windows: `pnpm --filter @letra-grande/desktop start` abre la ventana. Verificado con DevTools remoto: la página carga `app://letra-grande/` con título "Letra Grande", los scripts de hidratación en línea se ejecutan (la CSP con hashes los autoriza) y no hay service worker en modo escritorio.

### Decisiones que revisar

- `@types/node` no se declaró como dependencia (la consigna fue no añadir nada más): electron ya la trae transitivamente y `tsconfig.json` la resuelve con `typeRoots` apuntando al directorio hoisteado de pnpm (`node_modules/.pnpm/node_modules/@types`). Si se prefiere declararla explícitamente, es un cambio de una línea.
- La CSP permite `style-src 'self' 'unsafe-inline'`: la exportación prerenderizada usa atributos `style` en línea para los colores de estado y no ejecutan código. Los scripts en línea sí están controlados por hash sha256 calculado por archivo servido (`src/inline-scripts.ts`); cualquier bloque no conocido no se ejecuta.
- La raiz del renderer se resuelve relativa a `dist/` para desarrollo y se puede sobrecargar con `LG_DESKTOP_DIST`; la ruta empaquetada la ajusta DESK-03.
- `pnpm-workspace.yaml` añadió `onlyBuiltDependencies` (electron, esbuild, electron-winstaller): sin ella pnpm 10 no ejecuta el postinstall de electron y no se descarga el binario.

- `pnpm-workspace.yaml` añadió `onlyBuiltDependencies` (electron, esbuild): sin ella pnpm 10 no ejecuta el postinstall de electron y no se descarga el binario. En la ronda de correcciones del review gate se retiró `electron-winstaller` de la lista: es una dependencia transitiva de electron-builder que ya está instalada, pero su postinstall (elegir 7-Zip) solo hace falta para construir el instalador, así que DESK-03 devolverá a la lista lo que el empaquetado necesite.

### Correcciones de documento aplicadas (ronda del review gate)

El review gate pidió justificar en `docs/desktop.md` (sección 4) la excepción `style-src 'unsafe-inline'` de la CSP y ajustar la promesa del preload (versión, plataforma e `isDesktop` hoy; la ruta de la copia cifrada y el evento de actualización llegarán con DESK-03). Ambas correcciones están aplicadas en esa sección, con la persona responsable de la tarea como autora de la ronda.

## Siguiente paso

Desbloquea DESK-03 (instalador NSIS y actualizador).

## Cambios de alcance aceptados

Ninguno.
