# OPS-05c: el gate de review deja de dar falsos rojos

## Objetivo y motivo

El job `review-report` se ejecutaba al abrir cada PR, cuando el informe todavía no existe porque se escribe después de la revisión. Resultado: cada PR nacía en rojo y se quedaba en rojo hasta el final del ciclo. Un rojo que siempre está deja de significar algo, y el equipo aprende a ignorarlo justo cuando el gate importa.

## Alcance y restricciones

- Dentro: el disparador del job en `.github/workflows/check.yml` y la explicación del flujo en `docs/review-gate.md`.
- Fuera: el script de comprobación, los jobs `check` y `e2e`, y la política de merge.
- Invariantes del proyecto que aplican: el gate sigue siendo obligatorio y sigue fallando cuando falta el informe o el veredicto es `rechazado`; no se relaja ninguna comprobación.

## Superficie de edición (nuestra)

`.github/workflows/check.yml`, `docs/review-gate.md`, `odd/tasks/ops-05c-review-trigger.md`.

## Modo TDD (nuestra)

- Activo: no, es configuración de CI sin comportamiento ejecutable local. Se justifica aquí.
- Verificación sustituta: el propio PR. Se abre como borrador, se comprueba que el job no aparece en rojo, se añade el informe y al marcar listo el job pasa.

## Riesgo y review (nuestra)

- Tipo: entrega y CI.
- Review gate: obligatorio (sección 22). Es la única tarea que toca el gate mismo, así que la revisión mira que la comprobación siga siendo un gate y no un adorno.
- Riesgo: elemento 5 (CI y entrega). El riesgo concreto es dejar una vía para fusionar sin informe.

## Tareas

- [x] Añadir `ready_for_review` a los tipos de evento `pull_request`.
- [x] Condicionar el job al PR no borrador.
- [x] Documentar el flujo de borrador en `docs/review-gate.md`.
- [ ] Probar el flujo en el propio PR: borrador sin rojo, listo con informe en verde.

## Evidencia y progreso

El job conserva sus dos condiciones de fallo: no existe `odd/reviews/<id>.md`, o el front matter está incompleto, o el veredicto es `rechazado`. Lo único que cambia es **cuándo** se ejecuta: nunca en un borrador.

Un borrador no se puede fusionar, así que no hay vía para llegar a `dev` sin que el job se haya ejecutado al menos una vez sobre el estado final. En cuanto el PR deja de ser borrador, cada push vuelve a ejecutarlo.

## Siguiente paso

Todos los PRs de este repositorio se abren como borrador y se marcan listos con el informe ya commiteado.

## Cambios de alcance aceptados

Ninguno.
