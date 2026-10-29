# Review gate REF-QA-08-03: el vault fuera de la primera carga

---
tarea: REF-QA-08-03
base: 0418c16
revisado: 0418c16
revisor: jd-judge-a
veredicto: aprobado con cambios
---

## Resumen

Revisada la carga diferida del vault. Sin bloqueantes: el revisor confirmó sobre la build real que el paquete sale de siete de las nueve rutas y queda solo en `/carpeta` y `/ajustes`, que el flujo de crear, desbloquear, bloquear y el bloqueo por inactividad no cambia, y que la clave no cambia de ciclo de vida: el `import()` ocurre antes de derivarla y sigue viviendo solo dentro del `Vault`. Tres recomendados, todos aplicados: dos cifras documentadas mal convertidas y el test que ancla la decisión, que era burlable.

## Hallazgos

### 1. [recomendado] docs/rendimiento.md, tabla del presupuesto

Problema: la columna de presupuesto de las siete rutas decía 154.0 KiB para un límite de 154 000 bytes, que son 150.4 KiB. El propio documento se contradecía: daba 150.4 KiB a `/onboarding`, con el mismo límite. La suma de máximos real es 1669.9 KiB, no 1695.3.
Aplicado: la fila y la suma corregidas, comprobadas con el propio presupuesto.
Esfuerzo: S.

### 2. [recomendado] apps/web/perf/budget.json, `$comment`

Problema: arrastraba frases del comentario anterior. Decía márgenes de 16.6 a 17.7 KiB cuando con los límites nuevos van de 13.5 a 16.7, y una suma de máximos de 1695 KiB frente a 1670 reales. Un comentario versionado que no describe el presupuesto que acompaña es peor que no tenerlo.
Aplicado: las dos cifras reescritas con los valores medidos.
Esfuerzo: S.

### 3. [recomendado] apps/web/src/components/carpeta/sesion-ligero.test.ts

Problema: el test que impide volver al import estático se podía burlar de tres formas: comillas simples (no matcheaban el filtro por comillas dobles), un reexport desde un módulo puente (el test solo lee `sesion.ts`) y un `await import` a nivel de módulo (cumplía el segundo test y volvía a cargar el vault al arrancar el shell).
Aplicado: el test exige ahora que no exista ningún import de valor del paquete (comillas simples o dobles, multilínea, `export ... from`, `require`), que exista el `import type`, que el `import()` esté dentro de `abrirSesion` y que no aparezca antes de esa función.
Esfuerzo: M.

### 4. [nota] El test tenía un falso negativo con imports multilínea

Un import de tipos partido en varias líneas no empieza por `import type ` y el test fallaba sin que hubiera import de valor. Resuelto con el mismo cambio del hallazgo 3.

### 5. [nota] Higiene del worktree

`DesignUI/`, `apps/web/public/img1.jpg`, `apps/web/public/landing.png` y `test-results/` siguen sin trackear y ajenos a la tarea. No entran en el PR.

### 6. [nota] Documento de tarea incompleto en el momento del review

Tareas sin marcar y sección de evidencia pendiente mientras el backlog ya decía "Hecho". Rellenado antes del PR, con las cifras de antes y después.

### 7. [nota] `pnpm style` en local

Falla solo por `.atl/skill-registry.md`, un directorio de herramientas ignorado por git y ausente en una máquina limpia. Ajeno a este cambio.

## Comprobaciones propias del revisor

- `git status` y `git diff`: los cuatro ficheros tocados y los dos nuevos, todos dentro de la superficie declarada.
- `node scripts/check-bundle-budget.mjs apps/web/.next`: pasa con 11 rutas y 1509.6 KiB, sobre una build posterior a los fuentes.
- Escaneo de marcadores del vault (`PBKDF2`, `WrongPasswordError`) en los chunks de primera carga: solo aparecen en `/carpeta` y `/ajustes`. Ninguna otra ruta lo carga, ni directa ni indirectamente; `Sidebar.tsx` consume `sesion`, que ya es type-only.
- `vitest run src/components/carpeta/`: 30 en verde.
- `decisions:check`, `test:scripts`, `typecheck`, `test` y `content:validate` en verde.
- Doble carga descartada: el módulo se cachea entre desbloqueos y en las dos rutas que lo tienen resuelve al mismo chunk que ya viaja en la primera carga.
- Sin rayas largas ni medias rayas, sin `any`.

## Qué se aplicó en la ronda de correcciones

Los tres recomendados y las notas 4 y 6. La verificación final (check completo y e2e con el spec de carpeta) la hace la CI de este PR, porque la ronda cambió un test unitario y documentación, no comportamiento.
