# OPS-05d: el informe de review se acepta con el id completo o con el id base

## Objetivo y motivo

El comprobador de CI extrae el id de tarea del título del PR con el patrón `LETRA-NUMERO`, así que una tarea partida en mitades como `AI-03a` buscaba `odd/reviews/ai-03.md` y fallaba si el informe se llamaba `ai-03a.md`, o al contrario. Pasó de verdad al cerrar AI-03a. Se acepta cualquiera de los dos nombres y el mensaje de error nombra ambos.

## Alcance y restricciones

- Dentro: `scripts/check-review-report.mjs`, sus tests y una línea de `docs/review-gate.md`.
- Fuera: el resto del gate, el flujo de borrador (OPS-05c) y la política de merge.
- Invariantes: el gate sigue fallando cuando no existe ninguno de los dos nombres y cuando el veredicto es `rechazado`.

## Superficie de edición (nuestra)

`scripts/check-review-report.mjs`, `scripts/check-review-report.test.mjs`, `docs/review-gate.md`, `odd/tasks/ops-05d-report-names.md`.

## Modo TDD (nuestra)

- Activo: sí, sobre el script.
- Runner: `node --test`.
- RED: los tres tests nuevos se escriben antes del cambio; los de "acepta el id base" fallan con el patrón anterior.

## Riesgo y review (nuestra)

- Tipo: entrega y CI.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5. El riesgo concreto es aceptar por error el informe de otra tarea: solo se relaja el nombre, no la existencia ni el contenido.

## Tareas

- [x] Patrón de id con letra final opcional.
- [x] Búsqueda del informe por el id completo y, si lleva letra, por el id base.
- [x] Mensaje de error que nombra las dos rutas posibles.
- [x] Tests de los tres casos y línea en la documentación.

## Evidencia y progreso

- Los tests del gate atraparon un error propio durante el cambio: un `expectedPath` sin definir en los mensajes posteriores, que rompía siete casos. Corregido antes de commitear; quedó como recordatorio de que la suite del gate sirve.
- `node --test scripts/check-review-report.test.mjs`: 17 de 17 en verde: dos tests nuevos (informe de otra tarea y orden de candidatos) y los tres de la relajación ajustados.
- Ronda de correcciones del review gate: documentación en `docs/review-gate.md`, ruta del mensaje con `basename` (Windows), y el gate compara ahora el front matter `tarea:` con el id del título (completo o base) para impedir que valga el informe de otra tarea.

Ronda de correcciones aplicada: línea en la documentación, `basename` para la ruta en Windows, comparación del campo `tarea:` con el id del título para cerrar el falso positivo del informe de otra tarea, test que fija el orden de candidatos y limpieza con `try/finally`. `REF-OPS-05e` registrado para el checkout del merge ref. Informe en `odd/reviews/ops-05d.md`.

## Siguiente paso

Ninguna tarea partida volverá a fallar por el nombre del informe.

## Cambios de alcance aceptados

Ninguno.
