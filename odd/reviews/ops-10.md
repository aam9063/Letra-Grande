---
tarea: OPS-10
base: c6d5e3d
revisado: 599e5a8
revisor: jd-judge-b
veredicto: aprobado con cambios
---

## Resumen

La tarea aterriza bien el incidente: la regla queda escrita en tres documentos, la decisión está aislada en una función pura con seis tests en verde y el mensaje de fallo explica el arreglo en lugar de solo romper. No he encontrado falsos rojos: los PRs a `dev` y los push salen por "No aplica" sin tocar git. El problema serio está en la integración con Actions: el job comprueba el merge ref que GitHub construye para el PR, no la punta de la rama, así que en cualquier PR fusionable la comprobación da verde siempre y la garantía que documenta `docs/review-gate.md` no se cumple en CI.

## Verificaciones ejecutadas

- `node --test scripts/check-main-history.test.mjs`: 6 tests en verde.
- `GITHUB_BASE_REF=main node scripts/check-main-history.mjs` en el worktree: verde ("La rama lleva toda la historia de main", `origin/main` = `e4d96b6` y es ancestro de `HEAD`).
- `node scripts/check-style.mjs`: "Estilo OK".
- Ciclo completo razonado: entrega con commit de fusión (ver hallazgo 1), PR a `dev` y push no se comprueban, y no hay caso de falso rojo encontrado.

## Hallazgos

### 1. [bloqueante] .github/workflows/check.yml:13-15 y scripts/check-main-history.mjs:87

Problema: en los eventos `pull_request`, `actions/checkout@v4` sin `ref` explícito descarga `refs/pull/<n>/merge`, el merge ref que GitHub construye fusionando la rama del PR sobre la base. Si el PR es fusionable, `main` es por construcción ancestro de ese merge ref, así que `git merge-base --is-ancestor origin/main HEAD` (check-main-history.mjs:87) da siempre cierto y la guardia pasa. El merge ref solo no existe cuando el PR ya tiene conflictos de contenido; ahí `checkout` cae al commit de la rama y la guardia sí salta. Consecuencia: la garantía documentada en `docs/review-gate.md` ("si `main` tiene commits que la rama no tiene, falla") no se cumple en CI. Dos casos concretos de falso verde: (a) después de una entrega de `dev` a `main` con commit de fusión, `main` tiene un commit que `dev` no tiene y el PR siguiente, antes del arreglo del paso 1, es fusionable y da verde; (b) un squash de `dev` a `main` que se fusione limpio (cambios en ficheros distintos) da verde aunque duplique historia. El caso que motivó la tarea sí se detecta, pero solo porque ese PR tenía conflictos reales: en esa situación GitHub ya marcaba el PR como no fusionable y el valor añadido se reduce al mensaje accionable. El propio documento de tarea dice que "un falso verde no protege de nada".

Propuesta: comprobar la punta de la rama, no el merge ref. Lo más barato sin tocar el resto del job: pasar el commit de la rama al script (`GITHUB_HEAD_SHA: ${{ github.event.pull_request.head.sha }}` en el `env` del paso, igual que el job `review-report` ya usa ese dato con el motivo contrario documentado en check.yml) y, en el script, hacer el `merge-base --is-ancestor` y el `log` contra ese hash cuando venga. Con `fetch-depth: 0` el commit está descargado.

Riesgo del cambio: bajo. Solo cambia el objetivo de la comprobación; los PRs correctos (con el paso 1 hecho) siguen en verde. Esfuerzo: S.

### 2. [recomendado] scripts/check-main-history.test.mjs

Problema: los seis tests cubren `evaluarHistoria`, la decisión, y eso está bien. Nadie prueba el comportamiento que de verdad rompe la build: que el script como programa salga con código 1 y escriba en stderr (check-main-history.mjs:97-101). Si alguien rompe `main()`, el encadenado del `exitCode` o el guard de entrada (línea 105), los tests siguen verdes y la guardia muere en silencio.

Propuesta: un test de subprocesso: crear un repositorio temporal donde `origin/main` tiene un commit que `HEAD` no tiene, ejecutar `node scripts/check-main-history.mjs` con `GITHUB_BASE_REF=main` y asertar código 1 y el texto del arreglo. Puede vivir en el mismo fichero de tests, marcado como lento si hace falta.

Riesgo del cambio: bajo. Esfuerzo: S-M.

### 3. [recomendado] scripts/check-main-history.mjs:105

Problema: la detección de "es el programa principal" usa `resolve(process.argv[1])` comparado en sensible a mayúsculas. `scripts/check-review-report.mjs:143-144` ya documentó la trampa de Windows ("Windows no distingue mayusculas en rutas") y por eso compara en minúsculas con `pathToFileURL`. Aquí, una invocación local con otra caja en la ruta (por ejemplo `node Scripts\Check-Main-History.mjs` en un sistema insensible a caja) salta la guardia en silencio y sale 0. En CI (Linux, rutas canónicas) no pasa.

Propuesta: reutilizar el patrón de `check-review-report.mjs` (`pathToFileURL` + `toLowerCase`), o extraer la detección a un helper compartido si hay una tercera repetición.

Riesgo del cambio: bajo. Esfuerzo: S.

### 4. [nota] scripts/check-main-history.mjs:52

Problema: el mensaje del arreglo dice "el contenido bueno es el de dev: git checkout dev -- .", pero la guardia aplica a cualquier PR cuyo destino es `main`, no solo al de `dev`. Si la entrega viene de otra rama, la instrucción manda ejecutar un comando equivocado.

Propuesta: hablar de "la rama de la entrega" y usar un comando genérico (`git checkout <rama> -- .`).

Riesgo del cambio: ninguno, es texto. Esfuerzo: S.

### 5. [nota] scripts/check-main-history.mjs:38

Problema: en un push el mensaje dice "el PR va a ninguna rama (push)". No hay PR en un push; la frase confunde más de lo que aclara.

Propuesta: "No aplica: es un push, no hay rama de destino." cuando `base` sea vacío.

Riesgo del cambio: ninguno. Esfuerzo: S.

### 6. [nota] scripts/check-main-history.mjs:96

Problema: `git log --oneline origin/main ^HEAD` lista todos los commits divergentes sin límite. Tras una divergencia larga (justo el escenario que la guardia vigila), el mensaje puede volcar cientos de líneas en el log de CI.

Propuesta: listar los primeros 10 y añadir "y N más".

Riesgo del cambio: ninguno. Esfuerzo: S.

### 7. [nota] .github/workflows/check.yml:16

Problema: `fetch-depth: 0` se paga en cada PR y push del repositorio, incluidas las ramas de tarea donde la guardia nunca aplica. Es un compromiso aceptado y el comentario del paso lo justifica; no es un fallo.

Propuesta: nada ahora. Si el historial crece y el checkout se nota, valorar descargar solo `main` y la rama del PR. Registrar como posible `REF-OPS-10`.

Riesgo del cambio: medio si se hace mal (la guardia necesita ver `origin/main`). Esfuerzo: M.

## Lo que está bien y no toca corregir

- Sin falsos rojos: PRs a `dev` salen por `base !== main` sin ejecutar git; los push igual o con `main` ancestro de `HEAD`; un PR a `main` con el paso 1 hecho queda en verde. No rompe ningún check existente: los pasos del workflow se añaden, no se tocan.
- Mensajes en español, tuteo, sin rayas largas, con el arreglo explicado; `pnpm style` en verde sobre los ficheros nuevos.
- Sin dependencias nuevas, sin secretos, sin `any`, sin errores tragados: el fallo de git del ancestro se captura de forma deliberada y documentada.
- Tests que prueban la decisión, no la implementación, con el caso real del incidente (`e4d96b6 Dev (#35)`) como dato.
- Documentación coherente entre `docs/review-gate.md`, `docs/ARRANQUE.md` (21.4), `CONTRIBUTING.md` y la fila de proceso del backlog; el documento de tarea declara alcance, superficie y riesgo antes del código.

## Veredicto

**Aprobado con cambios.** Un bloqueante: la guardia comprueba el merge ref y no la punta de la rama, así que no puede hacer valer la regla documentada en los PRs fusionables; el arreglo es pequeño (hallazgo 1) y conviene añadir el test del código de salida (hallazgo 2). El resto son recomendados baratos y notas.
