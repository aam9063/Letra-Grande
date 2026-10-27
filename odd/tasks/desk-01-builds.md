# DESK-01: build de dos salidas en `apps/web`

## Objetivo y motivo

El escritorio necesita el renderer como archivos estáticos, y la web sigue necesitando servidor porque el proxy del asistente es una ruta de API con POST. Hoy `apps/web` solo sabe construir la salida de servidor. Esta tarea añade la salida estática sin tocar la web ni duplicar componentes.

## Alcance y restricciones

- Dentro: `apps/web/next.config.ts` con dos modos, scripts de build, la forma de dejar fuera la ruta de API en la salida estática, y un paso de CI que construya las dos para que una rotura no pase inadvertida.
- Fuera: la aplicación Electron en sí (DESK-02), el empaquetado y el actualizador (DESK-03), cualquier cambio de comportamiento de la PWA.
- Invariantes del proyecto que aplican: la web no cambia de rutas ni de comportamiento; la clave de IA sigue solo en el servidor; el `webpack` de `extensionAlias` se mantiene en las dos salidas porque los paquetes del workspace son fuentes TypeScript con especificadores `.js`; sin dependencias nuevas si se puede evitar.

## Superficie de edición (nuestra)

`apps/web/next.config.ts`, `apps/web/package.json`, `package.json` (script raíz si hace falta), `.github/workflows/check.yml`, `odd/tasks/desk-01-builds.md`.

## Modo TDD (nuestra)

- Activo: no en el sentido de test unitario, con justificación: es configuración de build. La verificación es la propia construcción.
- Verificación exigida: `pnpm build` sigue produciendo la web con las mismas rutas (incluida `/api/assistant`), y la orden de escritorio produce un directorio estático con `index.html`, las rutas de la app y **sin** `/api`. Las dos en el mismo commit.

## Riesgo y review (nuestra)

- Tipo: build y entrega.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5. Una exportación que se lleve por delante la web, o una web que pierda el proxy, es un fallo de entrega; el CI debe construir las dos salidas.
- Riesgo de la tarea: cambio de build, reversible.

## Tareas

- [x] Modo de build por variable de entorno: salida de servidor (por defecto) y salida estática (escritorio).
- [x] La ruta de API no entra en la salida estática.
- [x] Scripts: `build` (web) y `build:desktop` (estático), con un directorio de salida distinto para no pisar `.next`.
- [x] Paso de CI que construye las dos.
- [x] Verificado: rutas de la web intactas y salida estática sin `/api`.

## Evidencia y progreso

Implementado y verificado el 2026-10-27 (worktree desk-01, rama `lg/desk-01-builds`):

- Mecanismo elegido para la API: `pageExtensions: ["tsx", "jsx", "js"]` solo en modo escritorio. La ruta `api/assistant/route.ts` es `.ts`, así que queda fuera de la exportación, mientras que todas las páginas y layouts son `.tsx` y entran igual. Sin renombrar ni duplicar nada. Justificado en comentario en `next.config.ts`.
- `pnpm build` (web, salida `.next`): rutas sin cambios antes y después: `/`, `/_not-found`, `/ajustes`, `ƒ /api/assistant`, `/asistente`, `/ayudas`, `/carpeta`, `/datos`, `/familia`, `/hoy`, `/onboarding`, `/reclamar`, `/vida`.
- `pnpm build:desktop` (estático, salida `apps/web/dist-desktop`, que se limpia antes de construir): `index.html`, las 11 rutas de la app más `/_not-found` y `404.html`, y traza de build en el registro ("Collecting build traces"). Sin ningún directorio `api` en la salida (comprobado con `find dist-desktop -iname "*api*"`).
- CI: paso `pnpm build:desktop` en el job `check`, justo después de `pnpm build`, sin Playwright ni navegadores.
- Scripts raíz: añadido `build:desktop` en `package.json` y `apps/web/package.json` (usa `cross-env` y `node -e` con `fs.rmSync`, sin dependencias nuevas).
- `pnpm check` en verde (style, typecheck, test y content:validate).

Ronda de correcciones aplicada: `LG_DESKTOP` acepta `1` y `true` y falla con un mensaje claro ante cualquier otro valor; `REF-DESK-01` registrado para vigilar que ninguna ruta futura sea `.ts`; y anotado para DESK-03 que la exportación incluye metadatos de Next que no deben empaquetarse. Informe en `odd/reviews/desk-01.md`.

## Siguiente paso

Desbloquea DESK-02 (ventana Electron con protocolo `app://`).

## Cambios de alcance aceptados

Ninguno.
