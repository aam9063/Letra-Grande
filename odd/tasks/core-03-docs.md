# CORE-03: documentación de arquitectura y modelo de datos

## Objetivo y motivo

La Ola 1 produjo catorce tareas de código y ninguna documentación de conjunto: quien llega nuevo solo tiene el documento de diseño original, que describe lo planeado, no lo construido. Esta tarea escribe `docs/ARCHITECTURE.md` y `docs/data-model.md` a partir del código real y enlaza ambos desde el README.

## Alcance y restricciones

- Dentro: `docs/ARCHITECTURE.md`, `docs/data-model.md` y la sección de lectura del `README.md`.
- Fuera: cambios de código, de esquema o de comportamiento; el resto de documentos de `docs/`, que pertenecen a sus tareas (guías de contribución, e2e, review gate, proveedor de IA).
- Invariantes del proyecto que aplican: ninguna afirmación sobre el código que no sea verificable en el repositorio; sin datos inventados; sin rayas largas ni medias rayas.

## Superficie de edición (nuestra)

`docs/ARCHITECTURE.md`, `docs/data-model.md`, `README.md`, `odd/tasks/core-03-docs.md`.

## Modo TDD (nuestra)

- Activo: no, es documentación sin comportamiento ejecutable. Se justifica aquí.
- Verificación sustituta: cada afirmación se contrasta con el archivo que la sostiene (paquetes, rutas, formatos del vault, reglas del validador de contenido) y `pnpm style` comprueba el estilo del texto.

## Riesgo y review (nuestra)

- Tipo: documentación de arquitectura.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 6 (documentación sin test que derive de la realidad y confunda a quien la lea). La revisión se centra en que cada afirmación se pueda comprobar en el código y en que no prometa piezas que todavía no existen.
- Riesgo de la tarea: ninguno de los seis elementos de alto riesgo. No toca datos, seguridad, contratos ni entrega.

## Tareas

- [x] `docs/ARCHITECTURE.md`: garantías, vista general, dónde corre cada pieza, responsabilidades por paquete, flujo de una pregunta y de un documento, seguridad, decisiones de la Ola 1, verificación y deuda.
- [x] `docs/data-model.md`: contenido como código, tipos comunes, fichas de empresa, organismo y trámite, catálogo de bloques y validación de cifras, registros del vault, formatos binarios cifrados y versionado.
- [x] Enlazar ambos desde el README con un orden de lectura para quien llega.
- [x] Contrastar cada afirmación con el código y pasar `pnpm style`.

## Evidencia y progreso

- Se revisó el código real antes de escribir: `packages/schema/src/*`, `packages/vault/src/{crypto,backup,vault}.ts`, `packages/ai/src/*`, `packages/design/src/*`, `apps/web/src/app/**` y `apps/web/next.config.ts`.
- Correcciones hechas durante la tarea: el README y la arquitectura no mencionan Tailwind ni el grupo de rutas `(app)`, porque ninguna de las dos cosas está en `dev` todavía (la sesión de interfaz trabaja en ellas).
- Los paquetes `radar` y `extract` se documentan como pendientes, no como existentes, y el modelo de datos deja explícito qué falta por documentar cuando existan.
- `pnpm style` en verde.

## Siguiente paso

Desbloquea la incorporación de nuevas personas y sirve de base para RADAR-01, que tendrá que ampliar la sección 10 del modelo de datos.

## Cambios de alcance aceptados

Ninguno.
