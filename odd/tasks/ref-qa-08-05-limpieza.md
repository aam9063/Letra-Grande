# REF-QA-08-05: limpieza menor del pase de arquitectura

## Objetivo y motivo

Es la última de las cinco tareas que salieron del pase de la ola (`odd/reviews/ola-2.md`, hallazgo 5). Agrupa la deuda pequeña que no tiene coste hoy pero que se queda ahí: una dependencia declarada sin usar, otra que es de desarrollo y está como de producción, y diez documentos con el nombre en mayúsculas mientras el resto están en minúsculas.

La tarea se planteó con cinco puntos. **Tres se hacen y dos no**, y el criterio es el mismo en los cinco: si el cambio no tiene riesgo y quita ruido, se hace; si cambia una API o una configuración con consumidores, se documenta y se deja.

## Alcance y restricciones

- Dentro:
  - Quitar `zod` de `packages/ai/package.json`: está declarado y no se usa en `src` ni en `test`.
  - Mover `react-dom` de `dependencies` a `devDependencies` en `packages/design`: en el paquete solo lo usa la galería (`gallery/generate.tsx`, con `react-dom/server`), que es una herramienta de desarrollo. Ojo: el barrel **sí** exporta `buildGalleryHtml` (`packages/design/src/index.ts:29`), así que `react-dom/server` entra en el grafo de la web; el cambio es seguro porque `apps/web` declara su propio `react-dom` y los `devDependencies` de paquetes privados del workspace se instalan siempre. El olor de fondo (exportar una herramienta de desarrollo desde el barrel) queda registrado como `REF-QA-08-05b`.
  - Renombrar los cinco documentos de `odd/tasks` y los cinco informes de `odd/reviews` que van en mayúsculas (`UI-03` a `UI-07`) para que coincidan con el resto.
- Fuera, con motivo:
  - **Unificar el setup de vitest** duplicado entre `apps/web` y `packages/design`: son once líneas idénticas, pero compartirlas exige un paquete de configuración y tocar dos `vitest.config.ts` de paquetes distintos. El beneficio es cosmético y el riesgo es que una configuración deje de cargar. Se queda como está.
  - **Renombrar los exports que mezclan español e inglés** en `packages/extract` y `packages/radar`: son la API pública de dos paquetes con decenas de llamadas; renombrar por estética cambia contratos internos que otras tareas consumen. En su lugar se fija la convención por escrito: el esquema es inglés porque es contrato compartido, y los helpers del monorepo van en español. La mezcla de `radar` (valores de `UnidadPlazo` en snake_case) queda registrada en el backlog como `REF-QA-08-05c`.
- Invariantes: ninguna dependencia nueva; sin cambios de comportamiento; el gate del informe de review sigue funcionando tras el renombrado.

## Superficie de edición

`packages/ai/package.json`, `packages/design/package.json`, `pnpm-lock.yaml`, `odd/tasks/` y `odd/reviews/` (solo renombrados), `docs/backlog.md`, `odd/tasks/ref-qa-08-05-limpieza.md`, `odd/reviews/ref-qa-08-05.md`.

## Modo TDD (nuestra)

- Activo: no aplica. Son dependencias declaradas y nombres de fichero: no hay comportamiento nuevo que probar. La verificación es que el monorepo siga entero (`pnpm check` y `pnpm e2e`) y que el gate del informe siga encontrando los ficheros renombrados, que ya compara sin distinguir mayúsculas (`scripts/check-review-report.mjs:25,33,73`).

## Riesgo y review (nuestra)

- Tipo: otro (higiene del monorepo).
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5 si quitar o mover una dependencia deja el build de otro proyecto sin lo que necesita. Mitigación: `pnpm check` completo y `pnpm e2e` sobre la build de producción, que es donde se notaría.

## Tareas

- [ ] Documento de funcionalidad antes del primer código.
- [ ] Quitar `zod` de `packages/ai` y mover `react-dom` a desarrollo en `design`, con el lockfile al día.
- [ ] Renombrar los diez documentos con `git mv`.
- [ ] Comprobar que el gate del informe sigue encontrándolos.
- [ ] `pnpm check` y `pnpm e2e` en verde.
- [ ] Review gate con informe y una ronda de correcciones.
- [ ] Backlog actualizado y PR.

## Evidencia y progreso

Rama `lg/ref-qa-08-05-limpieza`, sobre `dev` (231fac8).

### Los tres cambios

- `zod` fuera de `packages/ai/package.json`: cero usos en `src` y `test`. El paquete `schema` sigue declarándolo y usándolo, así que el lockfile conserva `zod@4.6.7` donde toca.
- `react-dom` movido a `devDependencies` en `packages/design`, con el lockfile al día. El motivo corregido está arriba: el paquete solo lo usa la galería, pero el barrel exporta el generador y por eso el cambio se apoya en que la web declara su propio `react-dom` y en que los `devDependencies` del workspace se instalan siempre. No se apoya en que «no se exporte», que era falso.
- Diez documentos renombrados de mayúsculas a minúsculas con `git mv`: `UI-03` a `UI-07` en `odd/tasks` y en `odd/reviews`. Y las trece referencias escritas a mano a esos nombres, que el review encontró y que eran justo el motivo del renombrado.

### El gate sigue funcionando

`scripts/check-review-report.mjs` compara sin distinguir mayúsculas (`:25`, `:33`, `:73`). Comprobado con títulos `UI-03: landing pública` y `ui-06: ajustes`: los dos encuentran su informe renombrado.

### Un tropiezo, contado

Al quitar `zod` con un reemplazo de texto dejé una coma final en el JSON de `packages/ai` y otra en el de `design`. `pnpm install` lo cazó al instante con `ERR_PNPM_JSON_PARSE`. Arreglado y validado con el parser de JSON antes de seguir: editar `package.json` a mano pide validarlo, no confiar en que el reemplazo quedó bien.

### Verificación

`pnpm decisions:check`, `pnpm test:scripts` (85 tests), `pnpm typecheck`, `pnpm test` (9 paquetes), `pnpm build` y `pnpm e2e` (174 pasan, 2 saltados) en verde.
