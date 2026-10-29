# QA-08: pase de arquitectura de la ola

## Objetivo y motivo

El backlog pide, al cerrar cada ola, que alguien mire el conjunto en lugar de las tareas una por una: duplicación entre carriles, grafo de dependencias, tamaño de bundle y nombres. Las reviews por tarea comprueban que cada pieza hace lo suyo; nadie comprueba que las piezas encajen entre ellas. Ola 1 tuvo su pase (`odd/reviews/ola-1.md`); desde entonces se han entregado el escritorio, siete pantallas de interfaz, cuatro módulos de extracción, el radar de plazos, el asistente y tres tareas de calidad, y no hay una vista de conjunto.

Esta tarea produce ese informe y convierte lo que encuentre en tareas `REF-<id>` en el backlog. **No arregla nada**: un pase que se pone a refactorizar deja de ser una auditoría y se convierte en un cambio grande sin revisar.

## Alcance y restricciones

- Dentro:
  - Auditoría de duplicación entre carriles y de nombres, con evidencia `ruta:linea`.
  - Auditoría del grafo real de dependencias entre paquetes (declaradas frente a usadas, ciclos, versiones divergentes) y del tamaño de bundle.
  - Informe en `odd/reviews/ola-2.md`, dice quién y cuándo, con el alcance declarado.
  - Tareas `REF-<id>` en `docs/backlog.md` para lo que aparezca, priorizadas por gravedad.
  - Registro de que QA-04 queda bloqueada por AI-03 y AI-04, decisión tomada con la persona responsable.
- Fuera:
  - Ejecutar cualquier `REF`: por definición no se hacen sin priorizarlos.
  - Tocar código de la app, paquetes o CI. Este PR solo añade documentos.
  - Revisar estilo o gusto: solo inconsistencias con coste real (que se arreglen una de dos copias y la otra no, que un nombre mienta, que una dependencia arrastre peso).
- Invariantes: nada inventado. Toda cifra del informe está medida y se dice cómo; lo que no se pudo comprobar se declara como no comprobado.

## Superficie de edición (nuestra)

`odd/reviews/ola-2.md`, `odd/tasks/qa-08-arquitectura.md`, `docs/backlog.md`.

Ni una línea de `apps/**`, `packages/**` ni `scripts/**`.

## Modo TDD (nuestra)

- Activo: no aplica. La tarea no cambia comportamiento: produce un informe y una lista de deuda. El propio informe es el entregable y su verificación es que cada afirmación se pueda comprobar leyendo el código en la ruta que cita.
- Verificación: contraste de los hallazgos delegados contra el código antes de publicarlos, y `pnpm check` y `pnpm e2e` en verde para demostrar que el pase no rompió nada (debería ser trivial: no toca código).

## Riesgo y review (nuestra)

- Tipo: otro (auditoría).
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 3 si una tarea `REF` propone cambiar un contrato que otros consumen; por eso el informe no ejecuta nada y cada `REF` queda como propuesta con su motivo. Sin riesgo de datos, privacidad ni CI.

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] Auditoría de duplicación entre carriles.
- [x] Auditoría de nombres.
- [x] Auditoría del grafo de dependencias.
- [x] Auditoría de tamaño de bundle.
- [x] Contraste de los hallazgos contra el código antes de publicarlos.
- [x] Informe `odd/reviews/ola-2.md`.
- [x] Tareas `REF-<id>` en el backlog y nota de bloqueo de QA-04.
- [ ] `pnpm check` y `pnpm e2e` en verde.
- [ ] Review gate con informe y una ronda de correcciones.

## Evidencia y progreso

Rama `lg/qa-08-arquitectura`, sobre `dev` (143f186).

### Cómo se hizo

Dos auditorías de solo lectura delegadas y en paralelo, una por duplicación y nombres y otra por dependencias y bundle, y contraste de cada afirmación contra el código antes de publicarla. El contraste no fue trámite: dos afirmaciones no se sostenían y aparecen corregidas en el informe.

- El auditor presentó el vault en la primera carga como el hallazgo de rendimiento: son **7.9 KiB crudos y 2.9 KiB gzip**, medidos con zlib sobre `apps/web/.next/static/chunks/342-3407b7356c91040e.js`. El acoplamiento es real; el peso no.
- El auditor citó `packages/extract/src/index.ts:70-78` para la mezcla de idiomas en los exports: esas líneas son código de PDF. Los exports están en `:142-156`.
- Afirmé en la primera versión del informe que los tonos de `landing.css:320-326` eran copia de `tokens.ts:36-41`. El review lo desmontó y tenía razón: esos hexes no existen en `tokens.ts`. La duplicación real está entre tres hojas (`landing.css`, `onboarding.css` y `globals.css`), y así queda escrito.
- El review también señaló que `globals.css` redeclara `--lg-espacio` y `--lg-radio` con valores distintos. Es deliberado según `layout.tsx:5-6`, y la REF lo dice para que nadie lo borre creyendo que es deriva.

### Hallazgos que quedaron en el informe

1. Tokens en tres sitios y literales sueltos. Cifras propias: 14 `#141414`, 17 `#ffffff` y 15 `#e3e3e8` en `landing.css`, con solo dos usos de `var(--lg-`; el lienzo diverge en caja entre `base.css:9` y `globals.css:3`.
2. El presupuesto cuenta los polyfills `noModule`: 110.0 KiB crudos y 38.7 KiB gzip que un navegador moderno no descarga, entre el 21 % y el 23 % de cada ruta presupuestada.
3. El vault en nueve rutas que no lo usan, por el import estático de `sesion.ts:4`.
4. La normalización de tildes tres veces en `packages/ai`, con la igualdad mantenida a mano.
5. Limpieza menor: `zod` sin usar, `react-dom` en `design`, setup de tests duplicado, cinco documentos en mayúsculas y exports mezclando idiomas.

### Lo que está sano

Grafo de dependencias sin ciclos y sin esquives de `apps/*`, `schema` respetado como contrato común sin tipos duplicados, camino crítico del bundle verificado en la build (cero coincidencias de tesseract y pdfjs en `static/chunks`), landing sin el vault ni el router de páginas, detección de datos personales solo en `packages/privacy`, y fechas y plazos solo en `packages/radar`.

### Salida

`REF-QA-08-01` a `REF-QA-08-05` en `docs/backlog.md`, priorizadas por coste de dejarlas. Ninguna se ejecuta aquí: este PR solo añade documentos. Y QA-04 queda marcada como bloqueada por AI-03 y AI-04, con la decisión escrita.
