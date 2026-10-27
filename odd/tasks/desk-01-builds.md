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

- [ ] Modo de build por variable de entorno: salida de servidor (por defecto) y salida estática (escritorio).
- [ ] La ruta de API no entra en la salida estática.
- [ ] Scripts: `build` (web) y `build:desktop` (estático), con un directorio de salida distinto para no pisar `.next`.
- [ ] Paso de CI que construye las dos.
- [ ] Verificado: rutas de la web intactas y salida estática sin `/api`.

## Evidencia y progreso

Pendiente de rellenar por quien implementa.

## Siguiente paso

Desbloquea DESK-02 (ventana Electron con protocolo `app://`).

## Cambios de alcance aceptados

Ninguno.
