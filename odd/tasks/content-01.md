# CONTENT-01: guía de verificación de datos y plantillas de contribución

## Objetivo y motivo

Dejar por escrito y en el repositorio cómo se verifica una ficha contra una fuente oficial y cómo se propone o corrige un dato sin programar. Es el trabajo que no se comprime con agentes (sección 10 y H-07): si el flujo no está claro, el contenido real nunca llegará verificado.

## Alcance y restricciones

- Dentro: `CONTRIBUTING.md` con el flujo de contribución de datos y de código, el checklist de verificación de la sección 10, `.github/ISSUE_TEMPLATE/dato-incorrecto.md` y `.github/ISSUE_TEMPLATE/propuesta-ficha.md`.
- Fuera: las fichas reales (`CONTENT-02` a `CONTENT-04`, `H-07`), `CODEOWNERS` por sector y política de moderación (`QA-06`, `H-04`), la plantilla de PR (pertenece a `OPS-05` para no solapar archivos), el gate de revisión (`OPS-05`).
- Invariantes del proyecto que aplican: no se inventan datos ni fuentes; una ficha solo es `verified: true` si una persona la ha verificado y lo dice el propio archivo; toda ficha lleva fuente con URL y fecha de consulta; sin datos personales de terceros en issues.

## Superficie de edición (nuestra)

`CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/**`.

## Modo TDD (nuestra)

- Activo: no, por ser documentación y plantillas sin comportamiento ejecutable. Se justifica en este documento.
- Verificación sustituta: el checklist debe decir exactamente lo que el validador de contenido exige (sección 8.7 y `CORE-01`), y las dos plantillas de issue deben existir, tener los campos de fuente, fecha y comunidad, y no contener datos reales. Se comprueba leyendo el validador y ejecutando `pnpm content:validate`.

## Riesgo y review (nuestra)

- Tipo: contenido y contribución.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 6 (documentación sin test que puede quedar desactualizada y prometer algo que la CI no comprueba). Review centrada en: que el checklist coincida con lo que el CI exige de verdad, que no prometa verificación automática ni asesoramiento jurídico, y que una persona pueda seguir el flujo sin ayuda.

## Tareas

- [x] T1: `CONTRIBUTING.md` con el flujo de datos, el checklist de la sección 10 y el flujo de código.
- [x] T2: plantilla de issue "dato incorrecto" con fuente, fecha y qué dato falla.
- [x] T3: plantilla de issue "propuesta de ficha" con sector, comunidad y fuentes candidatas.
- [x] T4: revisar que el checklist coincide con lo que valida el CI y corregir la diferencia.

## Evidencia y progreso

- Reglas del validador comparadas una a una contra `packages/schema/src/common.ts`, `procedure.ts` y `scripts/validate-content.ts`: verified exige `verifiedOn`, `verifiedBy` y una fuente que no sea `tercero`; el `sourceId` debe existir y no repetirse; pasos numerados 1, 2, 3 sin saltos; el nombre del archivo debe ser `<id>.yaml` (las plantillas que empiezan por `_` quedan excluidas); ids únicos por carpeta; cada `escalation` debe existir en `content/authorities`; y a los 180 días sale un aviso, no un error. Sin diferencias entre la especificación y la implementación.
- `pnpm check`: `Estilo OK.`, tipos y tests en verde, `Contenido OK: 0 ficha(s) válidas.`
- Los tres documentos y plantillas están en español, sin rayas largas ni medias rayas, y sin datos reales.

## Siguiente paso

Desbloquea `CONTENT-02`, `CONTENT-03` y `CONTENT-04`.

## Cambios de alcance aceptados

Ninguno.
