# OPS-06: migración a Next.js 16 y TypeScript 7

## Objetivo y motivo

El documento de arranque no fijaba versión de Next.js, así que la instalación inicial quedó en Next 15, React 19.0, TypeScript 5 y Vitest 3. Esta tarea aterriza la migración a Next 16.4.3, React 19.3.1, TypeScript 7.0.2, Vitest 5 y el resto de dependencias al día, y deja el repositorio compilando y probado con ellas.

## Alcance y restricciones

- Dentro: versiones de todas las dependencias del workspace, `pnpm-lock.yaml`, los `tsconfig.json` afectados, el script de Next con `--webpack`, el alta del archivo `apps/web/AGENTS.md` que genera `next dev`, y la exclusión de ese archivo generado en el comprobador de estilo.
- Fuera: cambios de producto, de esquema o de comportamiento. Esta tarea no añade funcionalidad.
- Invariantes del proyecto que aplican: TypeScript estricto intacto, sin dependencias de terceros en el navegador, sin secretos, la CI sigue ejecutando estilo, tipos, tests, validación de contenido, build y e2e.

## Superficie de edición (nuestra)

`package.json`, `pnpm-lock.yaml`, `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/AGENTS.md`, `apps/web/tsconfig.json`, `packages/*/package.json`, `packages/*/tsconfig.json`, `scripts/check-style.mjs`, `odd/tasks/ops-06-next-16.md`.

## Modo TDD (nuestra)

- Activo: no en el sentido de test nuevo, con justificación: es una migración de dependencias y no cambia comportamiento observable. La verificación es la suite completa existente, que es justo lo que tiene que seguir pasando.
- Verificación: `pnpm check` (estilo, tipos, tests y validación de contenido), `pnpm build` y `pnpm e2e` sobre la build de producción.

## Riesgo y review (nuestra)

- Tipo: entrega y entorno.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5 (dependencias y CI). Se revisa que el lockfile sea reproducible, que no se hayan relajado opciones de TypeScript, que no entren dependencias nuevas de terceros en el navegador y que el cambio de bundler esté justificado y probado.

## Tareas

- [x] Subir Next a 16.4.3, React y React DOM a 19.3.1, TypeScript a 7.0.2, Vitest a 5.0.5, jsdom a 30.1.3, Playwright a 1.64.1, cross-env a 10.1.0, `@types/node` a 24 y zod a 4.6.7.
- [x] Regenerar el lockfile y comprobar que instala con `--frozen-lockfile`.
- [x] Fijar `next dev --webpack` y `next build --webpack`: el proyecto resuelve los especificadores ESM `.js` de los paquetes del workspace con `webpack.resolve.extensionAlias`, que Turbopack no aplica.
- [x] Añadir el `apps/web/AGENTS.md` que genera `next dev` y excluirlo del comprobador de estilo, porque lo reescribe la herramienta en cada arranque.
- [x] Verificar `pnpm check`, `pnpm build` y `pnpm e2e` en verde.

## Evidencia y progreso

- `pnpm install` con el lockfile nuevo: `Lockfile is up to date`.
- `pnpm check`: estilo, tipos con TypeScript 7, tests de los cinco paquetes y validación de contenido en verde.
- `pnpm build`: Next 16.4.3 en modo webpack, compilación correcta, tres rutas (`/`, `/_not-found` y `/api/assistant` dinámica).
- `pnpm e2e`: 8 de 8 en los cuatro proyectos sobre la build de producción.
- Divergencia conocida: la sección 7 de `docs/ARRANQUE.md` conserva las versiones del diseño original (TypeScript 5.6). Se deja como documento histórico; la fuente de verdad de versiones es el `package.json` del repositorio.

## Siguiente paso

Desbloquea el rebase y merge de UI-02 y AI-02, que se escribieron contra Next 15.

## Cambios de alcance aceptados

1. El archivo `apps/web/AGENTS.md` es generado por `next dev`; se versiona para que el árbol quede limpio, como indica el propio archivo, y se excluye del comprobador de estilo en lugar de reescribirlo en cada arranque.
