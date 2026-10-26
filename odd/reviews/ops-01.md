# Review gate OPS-01: esqueleto del repositorio

---
tarea: OPS-01
base: 65070bb
revisado: 8d605d4
revisor: jd-judge-a (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

Verificado: `pnpm style`, `pnpm -r test` y `pnpm content:validate` pasan en local (Windows). Estructura conforme a la sección 6 dentro del alcance declarado (radar, extract, e2e, `.env.example` y las guías de contribución quedan fuera a propósito y está documentado en el documento de tarea). README con aviso de independencia, LICENSE MIT, CLAUDE.md, backlog generado, CI con `--frozen-lockfile`. Sin rayas largas ni medias rayas. Sin secretos en el diff: `NAN_API_KEY` solo aparece como nombre en la regla de `AGENTS.md` y `.env` está ignorado. Portada accesible: `lang="es"`, un único `h1`, contraste alto, `:focus-visible` y `prefers-reduced-motion`. El bug de `new URL().pathname` está corregido con `fileURLToPath`. `--passWithNoTests` está documentado con su regla de retirada.

No se ejecutaron `pnpm typecheck` ni `pnpm build` durante la revisión por ser de solo lectura: un `tsc --noEmit` con `incremental` escribe `tsconfig.tsbuildinfo`.

## Hallazgos

### 1. [recomendado] apps/web/tsconfig.tsbuildinfo:1

Problema: artefacto de build versionado en git.
Propuesta: añadir `*.tsbuildinfo` a `.gitignore` y hacer `git rm --cached`.
Riesgo del cambio: nulo. Esfuerzo: S.

### 2. [recomendado] .github/workflows/check.yml:17

Problema: el job `check` no ejecuta `pnpm build`, así que una build de Next rota pasaría la CI, aunque el documento de tarea la lista como verificación.
Propuesta: añadir `pnpm build` al job.
Riesgo del cambio: bajo, alarga la CI. Esfuerzo: S.

### 3. [nota] apps/web/package.json:21-27

Problema: `vitest`, `jsdom`, `@testing-library/react` y `cross-env` declarados sin script ni configuración que los use todavía. Es una decisión documentada (congelar el lockfile antes de la Ola 1), pero `cross-env` no aparece ni en la sección 7 ni en ningún script de hoy.
Propuesta: conservarlos por la decisión documentada y registrar `REF-OPS-01` para revisar en OPS-04 qué sobra.
Riesgo: ninguno. Esfuerzo: S.

### 4. [nota] packages/*/package.json (main y types apuntan a ./src/index.ts)

Problema: consumo de TypeScript sin build, válido con `moduleResolution: Bundler`.
Propuesta: suficiente para un monorepo privado; si algún paquete se publica hará falta build. Sin acción ahora.

## Chequeos explícitos pedidos por la persona responsable

- Code smells: ninguno bloqueante. Sin duplicación ni abstracciones prematuras; los `export {}` con comentario explican quién implementa cada paquete.
- Secretos en el código: no hay ninguno. La configuración futura va por variables de entorno y `.env` y `.env.*` están excluidos salvo `.env.example`.
- Lockfile: `--frozen-lockfile` en CI, `packageManager` fijado, `engines >=22` coherente con Node 22 de la CI. TypeScript declarado en la raíz y en cada paquete con el mismo rango.

## Qué se aplicó en la ronda de correcciones

- Hallazgo 1: `*.tsbuildinfo` añadido a `.gitignore` y el archivo sacado del índice.
- Hallazgo 2: `pnpm build` añadido al job `check` de CI.
- Hallazgos 3 y 4: no se ejecutan. `REF-OPS-01` (revisar dependencias declaradas por adelantado en OPS-04) y la nota sobre publicación de paquetes quedan registrados en `docs/backlog.md`.
