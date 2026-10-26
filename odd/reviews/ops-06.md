# Review gate OPS-06: migración a Next.js 16 y TypeScript 7

---
tarea: OPS-06
base: d12e98c
revisado: a8f8cc2
revisor: jd-judge-b (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

La migración es limpia y reproducible: el lockfile instala con `--frozen-lockfile`, no hay versiones mayores duplicadas de dependencias directas (solo una transitiva de `js-tokens`) y no se relajó ninguna opción de TypeScript: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride` e `isolatedModules` siguen igual, y no aparecen `as any`, `@ts-ignore`, `@ts-expect-error` ni `eslint-disable` nuevos. Los `types: ["node"]` añadidos en dos paquetes son aditivos. El pin a webpack está justificado y verificado contra la documentación instalada: Next 16 usa Turbopack por defecto y `--webpack` es la salida prevista cuando hay configuración de webpack propia, y `turbopack` solo ofrece `resolveAlias`, sin equivalente a `extensionAlias`. El archivo `apps/web/AGENTS.md` lo genera `next dev` y el propio bloque pide versionarlo; la exclusión del comprobador está acotada a ese único archivo. Rutas y scripts intactos, la ruta del asistente sigue con runtime Node y la etiqueta del contenedor de CI coincide con la versión de Playwright del lockfile. Sin dependencias nuevas de navegador, licencias compatibles con MIT, sin secretos.

## Hallazgos

### 1. [recomendado] apps/web/next.config.ts:7 y apps/web/package.json:6-7

Problema: quedarse en webpack no tenía plan de salida. Webpack está en modo mantenimiento y, el día que Turbopack soporte la resolución que necesitamos, el flag quedará obsoleto.
Propuesta: registrar la deuda. Aplicado: `REF-OPS-06` en `docs/backlog.md`.

### 2. [recomendado] docs/ARRANQUE.md:316, 485

Problema: el documento de arranque afirmaba TypeScript 5.6 y no mencionaba versión de Next, así que un agente que lo leyera podía reintroducir versiones viejas.
Propuesta: una nota que remita al repositorio. Aplicado: aviso al inicio de la sección 7.

### 3. [nota] .github/workflows/check.yml

Problema: la CI usaba Node 22 con `@types/node@24`, con los tipos por delante del runtime.
Propuesta: alinear. Aplicado: los tres jobs usan Node 24.

### 4. [nota] apps/web/AGENTS.md

Contiene rayas largas y por eso está excluido del comprobador; si alguien lo editara a mano, sus violaciones no se detectarían. Es aceptable: el archivo lo reescribe la herramienta en cada arranque.

## Qué se aplicó en la ronda de correcciones

Hallazgos 1, 2 y 3 aplicados; el 4 se acepta como limitación documentada. Resultado: `pnpm check`, `pnpm build` y `pnpm e2e` en verde con Next 16.4.3, React 19.3.1 y TypeScript 7.0.2, y CI en Node 24.
