---
tarea: OPS-12
base: 7111f22
revisado: 1d8e689
revisor: jd-judge-b
veredicto: aprobado con cambios
---

## Resumen

El cambio elimina la espera activa de comprobaciones (`gh pr checks --watch`) y en su lugar arma el auto-merge del repositorio con `gh pr merge --auto`. La motivación es correcta: los tokens fine-grained no ofrecen permiso sobre la API de Checks, así que la espera de OPS-11 no podía funcionar con el token mínimo. La dirección es buena y la documentación de `docs/review-gate.md` y del aviso de `SYNC_TOKEN` queda coherente con el nuevo comportamiento. Los problemas están en el manejo de errores del bloque final: un `catch` vacío que confunde todas las causas de fallo con "auto-merge desactivado", y un prerequisito de configuración del repositorio que no queda registrado en ninguna parte.

## Hallazgos

### 1. [bloqueante] scripts/sync-dev.mjs:255-262
Problema: el `catch {}` traga cualquier error de `gh pr merge --auto`, no solo "auto-merge no está activado en el repositorio". Otras causas reales: el PR está en estado limpio ya fusionable (gh sale con 1 y "Pull request is in clean status"), fallo transitorio de la API, rate limit, token sin alcance, red. En todos esos casos el script imprime "No se pudo armar el auto-merge; se intenta fusionar directamente", que atribuye el fallo a una causa equivocada, y lanza un merge directo sin comprobar el estado de las comprobaciones. Hoy no puede fusionar código en rojo porque la protección de `dev` exige las tres comprobaciones y `enforce_admins` está activo (comprobado en `odd/reviews/h-10.md` y `odd/reviews/ola-1.md`): GitHub rechazaría el merge y el script saldría con error. Pero esa seguridad es condicional: depende de que la protección de rama siga intacta, y el código no lo dice ni lo defiende. Además, si el `--auto` falla por algo transitorio mientras las comprobaciones siguen corriendo, el merge directo también falla, la ejecución acaba en rojo con un mensaje confuso y el PR queda abierto sin auto-merge armado: solo se recupera en el siguiente push a `main` (la reutilización del PR en la línea 225 lo rearma, pero hasta entonces `dev` queda desfasada en silencio para quien no mire Actions).
Propuesta: distinguir causas. Si el error contiene "clean status", fusionar directo está bien. Si contiene "auto-merge"/"not enabled", avisar de forma clara de que hay que activar el ajuste y fallar (o fusionar directo como hoy, pero con mensaje honesto). Para cualquier otra causa, fallar sin intentar el merge directo, y que el mensaje de error se imprima (hoy el `catch` vacío lo descarta y el lector de Actions no ve por qué falló el `--auto`). Añadir en el comentario que el merge directo solo es seguro mientras `dev` exija las comprobaciones por protección de rama.
Riesgo del cambio: bajo. Esfuerzo: S.

### 2. [recomendado] docs/review-gate.md:177 (y falta en cualquier otro sitio)
Problema: el nuevo diseño depende de un ajuste del repositorio ("Allow auto-merge" en Settings, General) que no se activa por código ni se verifica en el script. Si el ajuste no está activo, cada ejecución de `sync-dev` acaba en rojo (hallazgo 1) aunque el PR esté abierto y correcto. La documentación dice "las espera GitHub con el auto-merge del repositorio" pero no registra que hay que activar el ajuste una vez a mano, ni qué pasa si no está.
Propuesta: añadir una frase en la misma sección: el auto-merge se activa una vez en Settings, General, Pull Requests; si está desactivado, el workflow falla y los PR de sincronización quedan abiertos hasta la siguiente entrega.
Riesgo del cambio: nulo. Esfuerzo: S.

### 3. [recomendado] odd/tasks/ (no existe ops-12.md) y docs/backlog.md
Problema: el diff congelado no incluye documento de tarea ni actualización del backlog. Las reglas 2 y 9 de `AGENTS.md` piden documento de funcionalidad antes del primer código y backlog actualizado en el mismo PR. El riesgo "item 5" se declara en la línea del PR, pero no hay documento donde se desarrolle ni registro de que OPS-12 existió.
Propuesta: crear `odd/tasks/ops-12-auto-merge.md` (alcance: bloque final de `sync-dev.mjs` y sección de sincronización de `docs/review-gate.md`; riesgo: elemento 5) y actualizar la fila del proceso y entrega en `docs/backlog.md`.
Riesgo del cambio: nulo. Esfuerzo: S.

### 4. [nota] scripts/sync-dev.mjs:109
Problema: el cuerpo del PR marca `- [x] Auto-merge armado` en el momento de crear el PR, antes de ejecutar el comando que lo arma. Si el armado falla, el PR lleva un checkbox marcado que es falso. El checkbox anterior (`pnpm check` y `pnpm e2e` en verde) estaba sin marcar por la misma razón de honestidad.
Propuesta: redactar el checkbox como intención, no como hecho: "- [ ] Auto-merge: GitHub fusiona cuando `check`, `e2e` y `review-report` están en verde", o marcarlo solo tras armarlo con éxito (requiere editar el cuerpo, probablemente no merece la pena).
Riesgo del cambio: nulo. Esfuerzo: S.

### 5. [nota] scripts/sync-dev.test.mjs
Problema: no hay ningún test nuevo. El cambio de la línea 109 del cuerpo del PR no rompe los tests (ninguno afirma sobre ese checkbox), y la lógica nueva del try/catch es CLI y no está probada, igual que antes. El test suite no cubre el único bloque que cambió de comportamiento.
Propuesta: si se aplica el hallazgo 1, extraer la decisión (arma auto-merge / fusiona directo / falla) a una función pura con su test de `node --test`, siguiendo el patrón de `decidirSincronizacion`.
Riesgo del cambio: bajo. Esfuerzo: M.

### 6. [nota] .github/workflows/sync-dev.yml:36
Problema: `timeout-minutes: 30` estaba dimensionado para la espera de comprobaciones que ya no existe; una ejecución normal termina en un par de minutos. No es incorrecto, pero un lector nuevo puede deducir de ahí que el workflow sigue esperando.
Propuesta: bajarlo a 10 o dejarlo con un comentario. Opcional.
Riesgo del cambio: nulo. Esfuerzo: S.

## Preguntas concretas de la revisión

1. **Try/catch del auto-merge con fallos ajenos al auto-merge:** sí, se comporta mal (hallazgo 1). El `catch` vacío no distingue causas y descarta el mensaje de error original. El PR no queda "sin avisar" del todo: el merge directo fallido saca el script con código de error y la ejecución queda en rojo. Lo que queda sin aviso claro es la causa, y el PR queda abierto sin auto-merge armado hasta el siguiente push a `main`.
2. **¿Puede el catch fusionar algo que no esté en verde?** Hoy no, porque la protección de `dev` exige las tres comprobaciones y `enforce_admins` está activo: GitHub rechazaría el merge directo de un PR en rojo o con comprobaciones pendientes. Es una garantía externa al código y no está documentada como tal.
3. **Referencias restantes a esperar comprobaciones o al permiso Checks:** no hay restos funcionales. `--watch` y `pr checks` desaparecieron del script; solo quedan menciones históricas en `odd/reviews/ops-11.md`, que es un informe congelado y así debe quedar. La frase de `docs/review-gate.md:177` "lo fusiona ... cuando las tres comprobaciones están en verde" sigue siendo cierta (lo hace GitHub con auto-merge), y la del permiso de Checks describe el nuevo diseño con precisión.
4. **¿Es correcto el riesgo declarado (item 5)?** Sí: el cambio es de entrega y CI, igual que OPS-04, OPS-05 o H-10, que usan el elemento 5. El matiz es que el riesgo real nuevo (merge directo en el camino de fallo, hallazgo 1) merece mención en el documento de tarea, que de momento no existe.
5. **Lo que no entendería un lector nuevo:** que el catch es un catch-all y no "auto-merge desactivado" (el comentario de la línea 257 afirma exactamente eso); que el auto-merge del repositorio es un ajuste manual previo; y por qué el workflow tiene 30 minutos de timeout si no espera nada.

## Qué se aplicó en la ronda de correcciones

- Hallazgo 1 (bloqueante), aplicado: el `catch` se tragaba cualquier error y lanzaba un merge directo sin mirar nada. Ahora la decisión es una función probada, `esAutoMergeNoDisponible(mensaje)`: solo se cae al merge directo si el motivo es que el auto-merge no está disponible; cualquier otro error se imprime y la ejecución termina en rojo. Además queda escrito que la protección de `dev` es la que impide fusionar con comprobaciones rojas, en vez de dar por hecho que el script lo garantiza.
- Hallazgo 2 (recomendado), aplicado: `docs/review-gate.md` dice que el repositorio necesita **Allow auto-merge** activado, que es el prerrequisito manual del workflow.
- Hallazgo 3 (recomendado), aplicado: documento de tarea `odd/tasks/ops-12-auto-merge.md` y fila en el backlog.
- Hallazgo 4 (nota), aplicado: la casilla premarcada de "auto-merge armado" pasa a ser una frase sin casilla, porque se marca antes de armarse.
- Hallazgo 5 (nota), aplicado: dos tests para `esAutoMergeNoDisponible`, uno con el error real de auto-merge desactivado y otro con comprobaciones inestables, un 403 y un 429. Total: 13 tests.
- Hallazgo 6 (nota), aplicado: el timeout del workflow baja de 30 a 15 minutos.

Resultado: 13 tests en verde y `pnpm check` en verde.
Rellena el implementador.
