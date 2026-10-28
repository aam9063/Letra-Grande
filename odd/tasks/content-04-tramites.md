# CONTENT-04: fichas de trámites

## Objetivo y motivo

Con empresas y organismos escritos, falta lo que la persona hace: reclamar el suministro, darse de baja de una línea, cambiarse de operadora o reclamar un vuelo retrasado. Sin los pasos y los plazos, MOD-01 no puede generar una carta ni MOD-06 una calculadora: esta tarea escribe las cuatro fichas de trámite con fuentes oficiales, como borradores para H-07.

## Alcance y restricciones

- Dentro: `content/procedures/` con reclamar el suministro eléctrico, baja de línea, portabilidad y reclamación por retraso de vuelo, con pasos numerados, documentos, plazos y avisos cuando la fuente los da.
- Fuera: la carta generada (MOD-01), la calculadora de compensaciones (MOD-06) y los trámites de otras olas.
- Invariantes:
  - **Nada inventado**: pasos, plazos y documentos solo si están en la fuente consultada. Donde la fuente no da un plazo, la lista va vacía y se dice en la nota.
  - Cada paso y cada plazo cita su `sourceId`.
  - `verified: false` y fuentes `oficial`.
  - Sin datos personales.

## Superficie de edición (nuestra)

`content/procedures/**`, `docs/backlog.md`, `odd/tasks/content-04-tramites.md`.

## Modo TDD (nuestra)

- No hay lógica: la comprobación es `pnpm content:validate`, que exige pasos numerados 1, 2, 3, `sourceId` existentes y coherencia de la verificación.

## Riesgo y review (nuestra)

- Tipo: contenido.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 1 (un paso o un plazo equivocado hace que la persona pierda el derecho por pasarse de fecha).

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] Consultar las fuentes de cada trámite y anotar URL y fecha.
- [x] Escribir las cuatro fichas con pasos citados.
- [x] `pnpm content:validate` en verde (24 fichas).
- [x] Backlog actualizado y pendientes para H-07.

## Evidencia y progreso

Rama `lg/content-04-tramites`.

- Cuatro fichas: `reclamar-suministro-electrico`, `baja-linea-telefono`, `portabilidad-telefonia` y `reclamar-retraso-vuelo`.
- Lo que sí está citado: los pasos y plazos del suministro eléctrico salen de la página de la CNMC (reclamar a comercializadora o distribuidora, acuse de recibo, 15 días hábiles y 5 en el caso concreto de menos de 15 kW, resolución alternativa u órgano autonómico, y que la CNMC no resuelve). Los de telefonía salen de la Oficina de Atención al Usuario: canales del operador y el plazo de un mes antes de acudir a la Oficina.
- Lo que **no** afirman, a propósito: el plazo de ejecución de la portabilidad (la página consultada no lo da y el dato de un día hábil que aparece en otras fuentes es autonómico, no del regulador), el preaviso de una baja (lo fija el contrato), y los importes de compensación y el plazo de la reclamación aérea (el reglamento europeo no se pudo consultar hoy). Todo eso queda como puntos de H-07, escrito en la nota de cada ficha y en un aviso dentro de la ficha de vuelo.
- Review gate (`odd/reviews/content-04.md`, aprobado con cambios) y una ronda aplicada: las fichas de portabilidad y de baja ya no atribuyen a la fuente un proceso que no describe (se reescribieron como lo que la fuente sostiene: el cauce de reclamación), el `cost` del suministro deja solo el litigio gratuito y la ficha de vuelo se queda sin afirmar documentación, con el hueco señalado.
- Documentos: ninguna ficha los lista. La fuente que los menciona no se pudo consultar, así que no se escriben.

## Pendientes para H-07 (lista única)

1. Portabilidad: confirmar el plazo de ejecución con el regulador y añadirlo al plazo o al aviso.
2. Baja de línea: confirmar si hay preaviso contractual obligatorio.
3. Vuelo: añadir el reglamento aplicable con enlace consolidado, los importes de compensación y el plazo para reclamar.
4. Suministro: decidir si se añade la lista de documentos, que la CNMC no detalla.

## Siguiente paso

Verificación humana (H-07) y, después, MOD-01 y MOD-06.

## Cambios de alcance aceptados

Ninguno.
