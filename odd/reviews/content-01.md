# Review gate CONTENT-01: guía de contribución de datos

---
tarea: CONTENT-01
base: 543f15a
revisado: 09ffd89
revisor: jd-judge-a (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

El checklist dice la verdad sobre el validador: se comprobó regla a regla contra `validate-content-core.ts`, `common.ts`, `procedure.ts`, `company.ts`, `authority.ts` y el script, sin diferencias. Ninguna promesa prohibida: el documento prohíbe explícitamente la verificación automática, el asesoramiento jurídico y que un agente marque una ficha como verificada. La vía humana por issues funciona sin programar. Las dos plantillas tienen front matter válido con `name`, `about`, `title` y `labels`, piden fuente, fecha y comunidad, y avisan contra datos personales. Los riesgos de la sección 15 están reflejados. Español con tuteo, sin rayas, ejemplos con `example.com` y nombres ficticios. Sin secretos.

## Hallazgos

### 1. [recomendado] CONTRIBUTING.md:34

Problema: la enumeración de campos con `sourceId` era incompleta: el validador también comprueba `warnings` y `cost` de un trámite y `permanencia` de una empresa, y no se mencionaba que un organismo autonómico o local exige `region`.
Propuesta: completar la lista y añadir la regla de `region`. Aplicado.

### 2. [recomendado] CONTRIBUTING.md:25

Problema: se pedía ejecutar `pnpm check` sin los prerrequisitos para quien no programa.
Propuesta: tres líneas de preparación (clonar, Node 22 o posterior y pnpm, `pnpm install`). Aplicado.

### 3. [nota] docs/backlog.md:55

Problema: el backlog atribuía a CONTENT-01 la plantilla de PR de datos, que pertenece a OPS-05. Dos documentos que se contradicen derivan.
Propuesta: corregir la fila del backlog. Lo hace el orquestador en el cierre de ola, porque `docs/backlog.md` está fuera de la superficie de esta tarea.

### 4. [nota] CONTRIBUTING.md:13, 26

Problema: el checklist asumía saber abrir un pull request, y el paso a paso vive en la sección de código.
Propuesta: referencia cruzada en una frase. Aplicado.

## Qué se aplicó en la ronda de correcciones

Hallazgos 1, 2 y 4 aplicados en `CONTRIBUTING.md`. El hallazgo 3 se corrige en el PR de cierre de ola. `pnpm check` y `pnpm content:validate` en verde, tres plantillas válidas y ninguna raya larga ni media raya.
