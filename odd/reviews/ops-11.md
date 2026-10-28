---
tarea: OPS-11
base: c87502c
revisado: d5e8e51
revisor: jd-judge-b
veredicto: aprobado con cambios
---

# Review de OPS-11: sincronización automática de dev con main

## Qué se revisó

Dif congelado c87502c..d5e8e51 (7 ficheros, 365 líneas): scripts/sync-dev.mjs,
scripts/sync-dev.test.mjs, .github/workflows/sync-dev.yml, .github/workflows/check.yml,
docs/review-gate.md, docs/backlog.md y el documento de tarea. Entradas leídas: AGENTS.md,
odd/tasks/ops-11-sincronizacion-automatica.md, docs/review-gate.md (entrega a main),
scripts/check-main-history.mjs, scripts/check-review-report.mjs y los tres workflows.

## Qué se ejecutó

- node --test scripts/sync-dev.test.mjs: 6 tests, 6 en verde.
- node scripts/sync-dev.mjs sin SYNC_TOKEN: no-op explicativo, salida 0. Correcto.
- Simulación en repositorio temporal del caso de conflicto (fusión con conflicto,
  git checkout <devSha> -- ., commit, git diff --quiet <devSha> HEAD): el mecanismo
  funciona y el árbol queda idéntico a dev, con una consecuencia que ver en H1.
- Comprobación determinista del comportamiento de execFileSync ante un fallo de git push
  con la URL del token (ver H2): la primera línea del mensaje de error reproducida fue
  "Command failed: git push" seguida de la URL completa con el token de prueba dentro.

## Hallazgos

### H1. Bloqueante. La vía de conflicto inventa una resolución y deja la guardia de árbol sin efecto

- Archivo: scripts/sync-dev.mjs:138-142 (bloque catch del merge), con la guardia en 148-155.
- Problema: el documento de tarea dice textualmente que se excluye "cualquier automatización
  que resuelva conflictos de contenido: si el árbol no queda idéntico a dev, el script falla
  en vez de inventar una resolución". El catch hace justo lo contrario: git checkout devSha -- .
  fuerza el árbol de dev y git commit --no-edit completa la fusión, así que la guardia
  git diff --quiet devSha HEAD pasa siempre por construcción (verificado en simulación).
  El caso en que esto dispara es real dentro de las reglas del repo: una rama de funcionalidad
  fusionada a main trae contenido que dev no tiene y dev ha avanzado sobre las mismas líneas
  desde entonces. Resultado: el contenido que solo estaba en main se descarta en silencio, el
  PR se abre y se fusiona, y la divergencia main/dev reaparece como conflictos fantasma en la
  entrega siguiente, que es exactamente lo que OPS-10 nació a evitar. Además el PR declara
  "[x] Fusión sin conflictos" (ver H6) y docs/review-gate.md:177 promete "Si el árbol
  cambiara, no abre nada y falla", que en esta vía no se cumple.
- Propuesta: en el catch del merge, fallar con salida 1 y el mismo mensaje de "hay que
  mirarlo a mano" que ya usa la guardia de árbol. La resolución manual documentada
  (git checkout <rama> -- .) sigue disponible para la persona, que sí ve los conflictos.
- Riesgo si no se corrige: pérdida silenciosa de contenido de main en la línea de integración;
  la garantía "la sincronización no cambia contenido" deja de poder afirmarse.
- Esfuerzo: S.

### H2. Bloqueante. El token puede acabar en el log de Actions

- Archivo: scripts/sync-dev.mjs:161-162.
- Problema: la URL con el token incrustado va como argumento de git push (con la opción de
  forzar la subida) a través de execFileSync. Si el push falla (autenticación rechazada,
  protección de rama, red), Node lanza una excepción no capturada cuyo mensaje empieza por
  "Command failed:" seguido del comando completo, incluida la URL con el SYNC_TOKEN, y se
  imprime al log del job. Comprobado de forma determinista en un repositorio temporal. El
  log de un repo público lo ve cualquiera.
- Propuesta: no pasar el token por argv. Opciones mínimas: helper de credenciales desde
  el entorno, GIT_ASKPASS o cabecera http.extraheader vía configuración; en cualquier caso
  capturar la excepción y reescribir el mensaje sin el token antes de imprimirlo. Aplica
  también al caso local con GITHUB_REPOSITORY sin definir.
- Riesgo si no se corrige: fuga de un PAT con escritura sobre Contents y Pull requests en el
  log de CI; habría que revocarlo y revisar los logs.
- Esfuerzo: S.

### H3. Recomendado. Un PR ya existente rompe la re-ejecución y puede quedar abierto para siempre

- Archivo: scripts/sync-dev.mjs:169-177.
- Problema: si una ejecución previa murió (timeout del job de 30 min durante
  gh pr checks --watch) o el PR quedó rojo, la siguiente ejecución empuja la misma rama
  (el nombre es determinista) y gh pr create falla con "already exists": excepción no
  capturada, ejecución en rojo en cada push a main, y un PR que ya está en verde nunca
  llega a fusionarse. No hay ruta de recuperación automática.
- Propuesta: antes de crear, consultar el PR existente de la rama (gh pr view <rama> o
  gh pr list --head); si existe, saltar a la fase de watch y merge.
- Riesgo si no se corrige: la automatización se queda atascada hasta limpieza manual, con un
  error poco orientativo.
- Esfuerzo: S.

### H4. Recomendado. El GITHUB_TOKEN tiene más permisos de los que usa el job

- Archivo: .github/workflows/sync-dev.yml:17-19.
- Problema: se declara permissions: contents: write, pull-requests: write, pero ninguna
  operación privilegiada usa el GITHUB_TOKEN: el push y el gh van con SYNC_TOKEN y el
  checkout va con persist-credentials: false. Sobran los dos permisos de escritura.
- Propuesta: permissions: contents: read.
- Riesgo si no se corrige: superficie de ataque innecesaria si una acción del job se ve
  comprometida.
- Esfuerzo: S.

### H5. Recomendado. La decisión de seguridad central no tiene test

- Archivos: scripts/sync-dev.mjs:147-155; scripts/sync-dev.test.mjs.
- Problema: los 6 tests cubren necesitaSincronizacion, nombreDeRama y cuerpoDePr, pero
  la regla de oro (el árbol debe ser idéntico al de dev, y no abrir nada si no lo es) vive
  inline en main() y no está probada. Es la decisión que justifica la tarea entera y la
  única que impide escribir contenido. El documento de tarea declara "tests de las decisiones
  puras" y esta falta.
- Propuesta: extraer la decisión a una función pura y añadir el caso "el árbol cambia:
  no se abre PR".
- Riesgo si no se corrige: una regresión futura en la guardia no rompe la build.
- Esfuerzo: S.

### H6. Nota. El cuerpo del PR afirma de más en la casilla de verificación

- Archivo: scripts/sync-dev.mjs:71-73.
- Problema: "[x] Fusión sin conflictos y árbol idéntico al de dev" va marcado como verificado
  en la plantilla, pero existe la vía de conflicto (H1) en la que la fusión sí trae
  conflictos. La casilla "[ ] pnpm check y pnpm e2e" queda a su vez sin marcar aunque el PR
  se fusione porque están en verde.
- Propuesta: enunciar las casillas como condición del PR ("la fusión no trae conflictos y el
  árbol es idéntico al de dev: lo comprueba el script") o marcarlas según lo ocurrido.
- Riesgo: bajo, es una declaración del PR, no del código.
- Esfuerzo: S.

### H7. Nota. El fetch del script depende de que el repo sea público

- Archivos: scripts/sync-dev.mjs:107 con .github/workflows/sync-dev.yml:34-37.
- Problema: con persist-credentials: false, el checkout no deja credenciales en la config
  local, así que el git fetch --no-tags origin main dev del script va anónimo. Funciona en
  el repo público; en un fork privado o un espejo privado fallaría sin mensaje orientativo.
- Propuesta: mención en el comentario del workflow de que el repo debe ser público, o usar
  la URL con token también para el fetch (con H2 resuelto).
- Riesgo: bajo hoy, real si el repo deja de ser público.
- Esfuerzo: S.

## Comprobaciones que salen bien

- Caso "main ya es ancestro de dev": sale 0 con mensaje claro; el no-op sin SYNC_TOKEN
  también.
- El push de la rama nueva (creada con checkout -B desde el checkout de dev) a
  refs/heads/<rama> es correcto; git fetch origin main dev actualiza las referencias remotas
  de forma oportunista, así que los SHA son frescos.
- concurrency con cancel-in-progress: false serializa bien dos entregas seguidas.
- gh pr create y el resto de llamadas a gh van con GH_TOKEN por entorno, no por argv.
- "Risk: none" en el cuerpo del PR es la convención documentada en
  docs/review-gate.md:156, no un despiste de idioma.
- Los tests prueban decisiones, no implementación (salvo el hueco de H5).
- El título del PR de sincronización lleva id de tarea y el informe odd/reviews/ops-11.md
  viaja en dev, así que el check review-report del PR de sincronización pasa.
- docs/backlog.md y docs/review-gate.md reflejan el alcance salvo por el matiz de H1
  ("Si el árbol cambiara, no abre nada y falla" no se cumple en la vía de conflicto).

## Veredicto

**Aprobado con cambios.** El diseño general es sano (rama determinista, guardia de árbol,
token propio justificado, no-op sin secreto, tests del CLI en check), pero hay dos
bloqueantes con arreglo pequeño: el token puede filtrarse en el log si el push falla (H2) y
la vía de conflicto resuelve contenido por su cuenta en contra de la especificación de la
propia tarea (H1). Con H1, H2, H3 y H4 resueltos en una ronda, y H5 si sale barato, la tarea
queda lista. H6 y H7 son notas.
