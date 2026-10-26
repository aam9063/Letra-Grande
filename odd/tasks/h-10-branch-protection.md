# H-10: proteger `dev` y `main` en GitHub

## Objetivo y motivo

Sin protección, cualquiera con permisos puede publicar directo en `dev` o en `main`, y el gate de review, la CI y la revisión por riesgo se vuelven opcionales por olvido. Esta tarea activa la regla en el repositorio y la prueba de la única forma que cuenta: intentando saltársela.

## Alcance y restricciones

- Dentro: protección de rama en `dev` y en `main` con pull request obligatorio, las comprobaciones `check`, `e2e` y `review-report` requeridas, sin force push, sin borrado y con la regla aplicada también a administradores; y la constancia en el backlog y en el informe de ola.
- Fuera: la revisión legal (H-02), la verificación de contenido (H-07) y el resto de decisiones humanas de la Ola 0.
- Invariantes del proyecto que aplican: el merge de una PR sigue siendo una decisión humana; nada de esto cambia la política de entrega, solo la hace efectiva.

## Superficie de edición (nuestra)

`docs/backlog.md`, `odd/reviews/ola-1.md`, `odd/tasks/h-10-branch-protection.md`.

## Modo TDD (nuestra)

- Activo: no aplica, es configuración del repositorio. Se justifica aquí.
- Verificación sustituta: una prueba negativa real. Desde un worktree limpio se intentó publicar un commit directo en `dev` y se comprobó el rechazo con el mensaje de GitHub.

## Riesgo y review (nuestra)

- Tipo: entrega y entorno.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5. El riesgo concreto es dejar una protección decorativa que dé falsa seguridad, o bloquear tanto que nadie pueda recuperar el repositorio. La revisión mira exactamente eso.

## Tareas

- [x] Proteger `dev` y `main`: PR obligatorio, checks requeridos, sin force push ni borrado.
- [x] Probar el rechazo de un push directo.
- [x] Detectar que `enforce_admins` estaba desactivado y activarlo, porque con esa opción apagada el dueño se saltaba la protección.
- [x] Repetir la prueba con `enforce_admins` activo y confirmar el rechazo.
- [x] Registrar el estado en el backlog y en el informe de ola.

## Evidencia y progreso

Comprobaciones activas en `dev` y en `main`:

| Regla | Valor |
|---|---|
| Pull request obligatorio | Sí, con 0 aprobaciones (GitHub no permite aprobar el propio PR) |
| Comprobaciones requeridas | `check`, `e2e`, `review-report` |
| Rama actualizada antes de mergear | Sí |
| Force push | Prohibido |
| Borrado de la rama | Prohibido |
| Aplicado a administradores | Sí |

Primera prueba, con `enforce_admins` desactivado: el push directo **pasó**. Es el hallazgo importante de la tarea: la protección sin esa opción no protege al dueño del repositorio, que es quien la necesita. Segunda prueba, con `enforce_admins` activo: rechazo con `GH006: Protected branch update failed`, "Changes must be made through a pull request" y "3 of 3 required status checks are expected".

Incidente conocido: el commit de la primera prueba (`8cda87f`, vacío y sin cambios de contenido) quedó en la historia de `dev`, porque quitarlo exige reescribir esa rama y la herramienta del agente no permite operaciones destructivas de git. No afecta a nada y se explica aquí para que nadie lo confunda con trabajo real. Quitarlo requiere, desde una terminal normal: habilitar temporalmente el force push en la protección, hacer `git push --force-with-lease origin 779d0f5:dev` y volver a deshabilitarlo.

## Siguiente paso

El orquestador y cualquier colaborador entran por PR. La política de entrega del documento de arranque (sección 21.4) deja de depender de la buena voluntad.

## Cambios de alcance aceptados

1. `enforce_admins` activo, que también bloquea al dueño del repositorio. Es deliberado: la alternativa era una protección que el propio dueño podía ignorar sin darse cuenta.
