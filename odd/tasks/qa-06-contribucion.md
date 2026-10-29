# QA-06: modelo de contribución

## Objetivo y motivo

El proyecto quiere recibir datos verificados de otras personas, y hoy el flujo existe a medias: `CONTRIBUTING.md` (de CONTENT-01) tiene el checklist de verificación y la descripción del validador, y `.github/ISSUE_TEMPLATE/` tiene las dos plantillas. Lo que falta es lo que hace que el modelo se sostenga cuando llega alguien de fuera: **quién responde de cada parte del repositorio** y **qué se exige exactamente para aprobar un dato como verificado**.

Sin eso, el aviso de que "una persona verifica" depende de la buena voluntad, y no hay forma de que GitHub avise a quien corresponde cuando un PR toca fichas de un sector.

## Alcance y restricciones

- Dentro:
  - `.github/CODEOWNERS` con las rutas agrupadas por sector: contenido (empresas, organismos, trámites), código de los paquetes, aplicación web y escritorio, e infraestructura (CI, scripts, configuración del repositorio).
  - Política de verificación escrita en `CONTRIBUTING.md`: qué cuenta como verificación, quién firma `verifiedBy`, qué evidencia tiene que traer el PR y qué se rechaza sin discusión.
  - Cómo se activa la revisión de code owners en GitHub y por qué hoy no se activa.
  - Comprobación de que las plantillas existentes cubren lo que la política exige.
- Fuera:
  - Decidir la licencia del contenido ni el reparto definitivo de sectores entre personas: es H-04, tarea humana. Aquí solo se deja la estructura y un responsable único declarado.
  - Tocar `.github/PULL_REQUEST_TEMPLATE.md`: pertenece a OPS-05 y es otro carril.
  - Cambiar el validador de contenido (`packages/schema`): otro carril y otro PR por regla del proyecto.
  - Escribir un código de conducta o una política de moderación de comentarios: no está pedido y no hay comunidad todavía.
- Invariantes: nada de datos personales en documentos, y ninguna política que prometa verificación automática.

## Superficie de edición (nuestra)

`.github/CODEOWNERS`, `CONTRIBUTING.md`, `docs/backlog.md`, `odd/tasks/qa-06-contribucion.md`, `odd/reviews/qa-06.md`.

## Modo TDD (nuestra)

- Activo: no aplica. No hay comportamiento ejecutable: son documentos y un fichero de configuración de GitHub.
- Verificación: el formato de `CODEOWNERS` se comprueba a mano contra la especificación (patrones y propietarios válidos, rutas que existen) porque no hay validador local, y `pnpm check` demuestra que no se rompió nada.

## Riesgo y review (nuestra)

- Tipo: otro (proceso y contribución).
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 3 si la política de verificación contradice lo que exige el validador de contenido o relaja el invariante de "una persona verifica". Por eso la política se contrasta con las reglas que aplica `pnpm content:validate`.

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] `CODEOWNERS` por sector, con responsable único declarado como provisional.
- [x] Política de verificación en `CONTRIBUTING.md`.
- [x] Cómo se activa en GitHub y por qué espera a una segunda persona.
- [x] Comprobar las plantillas existentes contra la política.
- [x] `pnpm check` y `pnpm e2e` en verde, backlog y documento actualizados.
- [ ] Review gate con informe en `odd/reviews/qa-06.md`.
- [ ] PR.

## Evidencia y progreso

Rama `lg/qa-06-contribucion`, sobre `dev` (9afd38c).

### Decisión de gobernanza

Con la persona responsable: un **responsable único** (`@aam9063`) y la estructura por sector ya escrita, provisional hasta que H-04 decida el reparto. La alternativa habría sido dejar el contenido sin propietario, y entonces el fichero no serviría ni de aviso.

### Hallazgo que cambia el uso del fichero

GitHub no permite aprobar el propio PR y la revisión de code owners exige la aprobación de un propietario **distinto del autor**. Con un solo propietario, activar `Require review from Code Owners` bloquearía todos los PRs de esa persona, que es quien abre los de este repositorio. Por eso el `CODEOWNERS` entra como aviso y como mapa de responsabilidades, y la activación queda documentada para cuando exista una segunda persona. Está escrito en `CONTRIBUTING.md`, sección 1.5, para que nadie active la casilla pensando que mejora algo.

### Qué quedó escrito

`.github/CODEOWNERS` con 21 reglas: propietario por defecto, respaldo de todo `content/` y contenido por sector (`content/companies`, `content/authorities`, `content/procedures`), el contrato común (`packages/schema`), los siete paquetes, las dos aplicaciones y la infraestructura (`.github`, `scripts`, `package.json`, `pnpm-lock.yaml`, `tsconfig.base.json`, `docs` y `odd`). La cabecera explica cómo repartir sectores, que gana la última regla que coincide y que un equipo necesita permiso de escritura.

`CONTRIBUTING.md`, sección 1.2.1: qué cuenta como verificada (una persona, no un agente), quién firma `verifiedBy`, qué evidencia exige el PR (la fuente exacta y su fecha, no la portada), hasta cuándo vale una verificación (180 días, aviso, no cambio automático) y qué se rechaza sin discusión. Y la sección 1.5 con quién aprueba y cómo se activa.

### Contraste con lo que ya existe

- El validador real exige `verifiedOn`, `verifiedBy` y al menos una fuente de tipo distinto de `tercero` (`packages/schema/src/common.ts:66-73`), y la política dice lo mismo: no contradice nada, lo explica para quien no lee el código.
- Las plantillas de CONTENT-01 ya piden lo que la política exige: la de dato incorrecto pide la fuente oficial y avisa de que no vale un foro ni un comparador. No se tocaron.
- La plantilla de PR no se toca: pertenece a OPS-05, otro carril.

### Comprobado

Las 21 rutas del `CODEOWNERS` existen en el árbol, y todas las líneas llevan patrón y propietario con el formato que espera GitHub. El respaldo `/content/` va **antes** de los sectores porque en CODEOWNERS gana la última regla que coincide: así una carpeta nueva bajo `content/` cae en el propietario de contenido y no en el genérico, y un sector con su equipo sigue ganando al respaldo.
