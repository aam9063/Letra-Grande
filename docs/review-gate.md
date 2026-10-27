# Review gate: la revisión obligatoria tras cada tarea

La regla 8 de `AGENTS.md` lo dice sin matices: cuando una tarea está implementada y en verde, hay una revisión obligatoria antes de abrir el PR. Este documento describe cómo funciona esa revisión, qué escribe el revisor y qué comprueba la CI. La fuente de verdad es la sección 22 de `docs/ARRANQUE.md`.

## Cómo se abre un PR para que el gate no dé falsos rojos

El informe se escribe **después** de la revisión, así que un PR recién abierto nunca lo tiene. Para que eso no aparezca como un fallo rojo en cada push:

1. El PR se abre **como borrador**. En un borrador el job `review-report` no se ejecuta: los jobs `check` y `e2e` sí, porque el código y las pruebas ya se pueden validar.
2. Se lanza el review gate y se commit el informe en `odd/reviews/<id>.md`.
3. Se marca el PR como **listo para revisión** (`ready_for_review`). Ahí el job `review-report` se ejecuta por primera vez, y a partir de ese momento cada push lo vuelve a comprobar.
4. Si al marcar listo falta el informe, el job falla con la ruta exacta que hay que crear. Si el veredicto es `rechazado`, también falla.

El job hace checkout del **commit de la rama** (`github.event.pull_request.head.sha`), no del merge ref que GitHub construye por su cuenta. Así comprueba exactamente lo que hay en la rama cuando se marca el PR como listo, sin depender de que GitHub haya refrescado una referencia interna.

Con esto el rojo significa siempre lo mismo: falta algo o hay algo mal, nunca "todavía no llegó el turno del informe".

## Las dos capas de revisión

Hay dos capas y no compiten:

| Capa | Quién la dispara | Qué cubre |
|---|---|---|
| A. Revisión nativa de riesgo (RDD de gentle-ai) | Automática tras cada commit, si está activa | Solo los cambios de riesgo medio y alto |
| B. Review gate propio | El implementador, al terminar cada tarea con `pnpm check` y `pnpm e2e` en verde | Todas las tareas, con foco en simplificar, reutilizar y optimizar |

**La capa B no sustituye a la A ni la desactiva.** La revisión nativa funciona por riesgo: los cambios de riesgo bajo no se revisan, y no hay forma documentada de forzar la profundidad por tarea. Como en Letra Grande queremos una revisión después de cada implementación, el review gate es una capa nuestra que se suma a la nativa y garantiza que ninguna tarea se queda sin revisar.

## El flujo en nueve pasos

1. El implementador termina la tarea. `pnpm check` y `pnpm e2e` en verde.
2. Congela el cambio: hash del commit y rango `<base>..<sha>`.
3. Lanza un subagente revisor: contexto limpio, solo lectura, sin haber visto el razonamiento del implementador.
4. El revisor recibe el diff congelado, el documento `odd/tasks/<id>.md` y `AGENTS.md`.
5. El revisor escribe `odd/reviews/<id>.md`. Es lo único que escribe.
6. El implementador aplica una sola ronda de correcciones: bloqueantes y recomendados baratos.
7. Vuelve a pasar `pnpm check` y `pnpm e2e`, y cierra.
8. Lo que quede como `refactor` se convierte en tarea `REF-<id>` del backlog.
9. La CI comprueba que existe el informe. La persona hace el merge a `main`.

El revisor es otro agente porque ODD pide revisión con contexto nuevo: un modelo que revisa su propio razonamiento tiende a confirmar sus decisiones.

## El prompt del revisor

```text
Eres el revisor de código de Letra Grande. Trabajas en SOLO LECTURA: no editas código.
Lo único que escribes es el informe. Tienes contexto limpio: no conoces el razonamiento
de quien implementó.

Entradas: el diff congelado (<base>..<sha>), odd/tasks/<id>.md y AGENTS.md.

Revisa en este orden:
1. Corrección: criterios de aceptación, casos límite y casos de error.
2. Invariantes del proyecto: datos personales, red, bloques de IA con cita,
   contenido no inventado, clave de IA fuera del código.
3. Simplicidad: código muerto, abstracciones prematuras, duplicación con otros
   paquetes (reutilizar schema y privacy en lugar de reescribir).
4. Legibilidad: nombres, funciones largas, complejidad, comentarios que mienten.
5. Rendimiento, solo con evidencia o riesgo claro: tamaño de bundle, carga diferida,
   trabajo pesado en el hilo principal (valorar Web Worker), accesos repetidos a
   IndexedDB, renders innecesarios. No propongas memoización sin motivo.
6. Tests: ¿prueban comportamiento o implementación? Specs de Playwright frágiles
   (esperas fijas, selectores por CSS en lugar de rol o etiqueta), falta de casos de error.
7. Accesibilidad y textos de interfaz según AGENTS.md.
8. Dependencias nuevas, uso de any, errores tragados.

Reglas:
- No propongas cambios de alcance ni funcionalidades nuevas.
- Cada hallazgo lleva: severidad (bloqueante, recomendado, refactor, nota), archivo y línea,
  problema, propuesta concreta, riesgo del cambio y esfuerzo (S, M, L).
- Un refactor propuesto no debe cambiar el comportamiento observable y debe poder
  verificarse con los tests existentes.
- Si no hay nada relevante, dilo. No rellenes el informe.
- Termina con un veredicto: aprobado, aprobado con cambios o rechazado.
```

## Formato del informe

Archivo: `odd/reviews/<id>.md`. La plantilla vive en `odd/reviews/_template.md`.

```markdown
---
tarea: CORE-02
base: <sha>
revisado: <sha>
revisor: <modelo>
veredicto: aprobado con cambios
---

## Resumen
Dos o tres frases.

## Hallazgos

### 1. [bloqueante] packages/privacy/src/detect.ts:84
Problema: ...
Propuesta: ...
Riesgo del cambio: bajo. Esfuerzo: S.

### 2. [refactor] packages/privacy/src/mask.ts:12
Problema: ...
Propuesta: ...
Riesgo del cambio: medio. Esfuerzo: M. Pasa a REF-0xx.

## Qué se aplicó en la ronda de correcciones
Rellena el implementador.
```

## Métricas del gate

Para saber si el gate merece su coste:

- Hallazgos aceptados frente a hallazgos totales, por modelo de revisor.
- Número de bloqueantes encontrados por tarea.
- Si durante varias tareas seguidas no aparece ningún bloqueante ni recomendado, reconsiderar la profundidad o el modelo.
- Si la tasa de aceptación es muy baja, ajustar el prompt: probablemente está proponiendo demasiado.

## Reglas anti-bucle

- El revisor no escribe código.
- El implementador hace una sola ronda de correcciones. Después, nueva comprobación y cierre.
- Los refactores opcionales no se hacen en la misma tarea: pasan al backlog como `REF-<id>`.
- Un refactor no puede cambiar tests ni expectativas para que "pase": los mismos tests deben quedar en verde antes y después.
- Una nueva ronda solo con decisión humana.

## La comprobación en CI

`scripts/check-review-report.mjs` hace exigible el paso 9:

- Si el título del PR no lleva id de tarea (patrón `LETRA-NUMERO`, por ejemplo `OPS-05`), la comprobación no aplica y pasa.
- Si lleva id, exige `odd/reviews/<id>.md` (la búsqueda del archivo no distingue mayúsculas); cuando el id lleva una letra final (tareas partidas, como `AI-03a`), acepta también `odd/reviews/<id-base>.md` y, si falta el informe, el mensaje nombra las dos rutas posibles.
- El front matter `tarea:` del informe debe coincidir con el id del título del PR, completo o su base: un informe de otra tarea no vale y la comprobación falla diciendo de qué tarea es el informe y cuál reclama el PR.
- En cualquier caso exige las cinco claves del front matter (`tarea`, `base`, `revisado`, `revisor`, `veredicto`) y un veredicto válido (`aprobado`, `aprobado con cambios` o `rechazado`).
- Si falta el informe o el front matter, la CI falla nombrando la ruta exacta y la plantilla.

El workflow lo ejecuta con el título del PR, y antes ejecuta los tests del propio script, de modo que una regresión en la extracción del id rompa la build. El trigger `pull_request` incluye `edited`: si se renombra el título después de una ejecución en verde, la comprobación se vuelve a evaluar. En local se puede probar así:

```bash
node scripts/check-review-report.mjs "OPS-05: review gate en CI"
```

## Limitaciones conocidas de la comprobación en CI

- Si el título lleva dos ids de tarea (por ejemplo `OPS-05 y QA-08`), solo se comprueba el primero.
- La comprobación no compara el front matter `base` y `revisado` del informe con el diff del PR: un id reutilizado de una tarea anterior pasaría con el informe antiguo. La persona que hace el merge es la última barrera.

## Trampas del gate encontradas al usarlo (DESK-02)

Dos trampas aparecidas al cerrar tareas contra el gate, para no volver a pisarlas:

1. **El evento `ready_for_review` puede llegar con un payload viejo.** Al marcar un borrador como listo, el payload del webhook puede corresponder a un push anterior al último, así que el job `review-report` se ejecutaría sobre un commit viejo. Regla práctica: antes de marcar el PR como listo, comprueba que en el PR ya aparece la ejecución de checks del último push (el SHA de la pestaña Checks coincide con el head de la rama). Si el run todavía no ha llegado, espera y vuelve a marcar listo, o el job se disparará con datos rancios.
2. **La protección de rama es estricta y bloquea el merge si la rama va por detrás.** La rama base avanza mientras la feature está en revisión y, con "Require branches to be up to date before merging" activo, el merge se rechaza. Regla práctica: antes del merge, incorpora la base a la rama de la feature (`git merge main` en la feature, resuelve y sube) para que la comprobación de actualidad pase. Sin ese paso previo, GitHub bloquea el merge aunque todo esté en verde.

## La línea de riesgo en el PR

La plantilla de PR lleva una línea de riesgo con una convención fija y legible por máquina: el literal es exactamente `Risk: item N` o `Risk: none`, en inglés. No se traduce: así lo espera la plantilla de `.github/PULL_REQUEST_TEMPLATE.md`.

## Entrega a main: fusión, nunca squash

Regla fija desde que costó una tarde: **de `dev` a `main` se fusiona con commit de fusión, jamás con squash**, y antes de abrir esa entrega la rama tiene que llevar toda la historia de `main`.

Por qué. El trabajo del escritorio llegó a `main` en un solo squash ("Dev #35") mientras `dev` tenía esos mismos cambios repartidos en sus commits. La siguiente entrega de `dev` a `main` marcó diez conflictos que no eran de contenido: el mismo código, con dos historias distintas, puesto a la vez en los mismos ficheros. Resolverlo a mano es donde se pierden cambios sin que nadie lo vea.

Cómo se comprueba, sin depender de la buena voluntad:

- El job `check` ejecuta `scripts/check-main-history.mjs` en cada PR. Solo mira los PRs cuyo destino es `main`: si `main` tiene commits que la rama no tiene, falla y explica el arreglo, que es fusionar `main` en la rama con el contenido de la rama.
- El script tiene sus tests (`scripts/check-main-history.test.mjs`) y se prueban en el mismo job, así que una regresión en la comprobación rompe la build.

Qué hacer en cada entrega, en orden:

1. `git fetch origin` y `git merge origin/main` en la rama de la entrega. Si hay conflictos, el contenido bueno es el de la rama: `git checkout dev -- .` y commit de fusión.
2. Abrir el PR a `main` y esperar `check`, `e2e` y `review-report` en verde.
3. Fusionar con **Create a merge commit** en GitHub. El squash está bien para las ramas de tarea hacia `dev`, donde el historial por tarea no aporta nada; no para unir dos ramas de larga vida.

Después de cada entrega, `main` tendrá el commit de fusión que `dev` no tiene. Se vuelve a la normalidad fusionando `main` en `dev` (el paso 1 del siguiente ciclo), que no cambia ni una línea: solo une la historia.

## Pase de arquitectura por ola (QA-08)

La revisión por tarea no ve la duplicación entre carriles ni el crecimiento del bundle. Al cerrar cada ola, un revisor audita el conjunto: duplicación entre paquetes, grafo de dependencias, tamaño de bundle, coherencia de nombres y deuda acumulada. Genera tareas `REF-<id>` y un informe `odd/reviews/ola-<n>.md`.
