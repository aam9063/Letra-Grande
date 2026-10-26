# Review gate: la revisión obligatoria tras cada tarea

La regla 8 de `AGENTS.md` lo dice sin matices: cuando una tarea está implementada y en verde, hay una revisión obligatoria antes de abrir el PR. Este documento describe cómo funciona esa revisión, qué escribe el revisor y qué comprueba la CI. La fuente de verdad es la sección 22 de `docs/ARRANQUE.md`.

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
- Si lleva id, exige `odd/reviews/<id>.md` (la búsqueda del archivo no distingue mayúsculas) con las cinco claves del front matter (`tarea`, `base`, `revisado`, `revisor`, `veredicto`) y un veredicto válido (`aprobado`, `aprobado con cambios` o `rechazado`).
- Si falta el informe o el front matter, la CI falla nombrando la ruta exacta y la plantilla.

El workflow lo ejecuta con el título del PR, y antes ejecuta los tests del propio script, de modo que una regresión en la extracción del id rompa la build. El trigger `pull_request` incluye `edited`: si se renombra el título después de una ejecución en verde, la comprobación se vuelve a evaluar. En local se puede probar así:

```bash
node scripts/check-review-report.mjs "OPS-05: review gate en CI"
```

## Limitaciones conocidas de la comprobación en CI

- Si el título lleva dos ids de tarea (por ejemplo `OPS-05 y QA-08`), solo se comprueba el primero.
- La comprobación no compara el front matter `base` y `revisado` del informe con el diff del PR: un id reutilizado de una tarea anterior pasaría con el informe antiguo. La persona que hace el merge es la última barrera.

## La línea de riesgo en el PR

La plantilla de PR lleva una línea de riesgo con una convención fija y legible por máquina: el literal es exactamente `Risk: item N` o `Risk: none`, en inglés. No se traduce: así lo espera la plantilla de `.github/PULL_REQUEST_TEMPLATE.md`.

## Pase de arquitectura por ola (QA-08)

La revisión por tarea no ve la duplicación entre carriles ni el crecimiento del bundle. Al cerrar cada ola, un revisor audita el conjunto: duplicación entre paquetes, grafo de dependencias, tamaño de bundle, coherencia de nombres y deuda acumulada. Genera tareas `REF-<id>` y un informe `odd/reviews/ola-<n>.md`.
