# OPS-05e: el job de informe comprueba el commit de la rama

## Objetivo y motivo

El job `review-report` hacía checkout del merge ref del pull request, que GitHub construye por su cuenta y a veces con retraso. Al marcar un PR como listo, el job podía leer un estado anterior sin el informe y fallar por algo que ya estaba resuelto. Se vio al cerrar H-10 y DESK-00: hubo que editar el PR para relanzarlo.

## Alcance y restricciones

- Dentro: el checkout del job, la nota de `docs/review-gate.md` y el estado de `REF-OPS-05e` en el backlog.
- Fuera: el script de comprobación, el disparador por borrador (OPS-05c) y la política de merge.
- Invariantes: el gate sigue fallando cuando falta el informe o el veredicto es `rechazado`.

## Superficie de edición (nuestra)

`.github/workflows/check.yml`, `docs/review-gate.md`, `docs/backlog.md`, `odd/tasks/ops-05e-checkout-head.md`.

## Modo TDD (nuestra)

- Activo: no, es configuración de CI sin comportamiento local. Se justifica aquí.
- Verificación sustituta: el propio PR. Al marcarlo listo, el job debe ejecutarse y pasar a la primera, sin editar nada.

## Riesgo y review (nuestra)

- Tipo: entrega y CI.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5. Un checkout mal puesto podría comprobar el commit equivocado; la revisión confirma que `head.sha` es el correcto para un evento `pull_request`.

## Tareas

- [x] Checkout por `github.event.pull_request.head.sha`.
- [x] Sustituir en la documentación el apaño de "editá el PR" por la explicación del checkout.
- [x] Marcar `REF-OPS-05e` como hecho.

## Evidencia y progreso

- `pnpm style` en verde.
- Prueba en vivo: con el PR en borrador los tres checks se comportan como antes; al marcar listo, `review-report` se ejecutó a la primera sobre el commit de la rama y pasó, sin editar el PR ni empujar nada más. Es la comprobación que motivó la tarea.
- El job sigue ejecutando sus propios tests antes de comprobar el informe.

## Siguiente paso

Marcar un PR como listo deja de necesitar un relanzamiento manual.

## Cambios de alcance aceptados

Ninguno.
