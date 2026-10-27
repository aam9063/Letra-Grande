# OPS-07: orden del backlog y robustez del spec de carpeta

## Objetivo y motivo

El backlog seguía diciendo que AI-05 estaba "en rama" y no mencionaba el escritorio ni el trabajo de interfaz: quien lo leyera creería que no hay instalador. Además, el spec de carpeta fallaba en local en webkit por una etiqueta ambigua, y al investigarlo apareció un fallo real de producto: al recargar, la vista mostraba un fotograma con el formulario de crear carpeta antes de pasar al de desbloquear.

## Alcance y restricciones

- Dentro: `docs/backlog.md` con el estado real por bloque, el registro de tres refactores nuevos; el arreglo del fotograma en `VistaCarpeta` y las esperas y selectores exactos del spec de carpeta.
- Fuera: cualquier pantalla nueva y el carril de módulos.
- Invariantes: ninguna funcionalidad cambia; el estado de sesión y el vault siguen igual.

## Superficie de edición (nuestra)

`docs/backlog.md`, `apps/web/src/components/carpeta/VistaCarpeta.tsx`, `apps/web/e2e/carpeta.spec.ts`, `odd/tasks/ops-07-backlog-y-spec.md`.

## Modo TDD (nuestra)

- Activo: sí, en la forma que corresponde al fallo encontrado. La prueba es el spec de carpeta en webkit, que fallaba antes del cambio y pasa después.
- Runner: `playwright` para el flujo, sin test unitario porque la lógica del componente no cambia, solo el momento en que reacciona.

## Riesgo y review (nuestra)

- Tipo: interfaz y documentación.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 6. El arreglo toca un componente del carril de interfaz; la revisión mira que no cambie qué formulario se muestra cuando la sesión ya está resuelta.

## Tareas

- [x] Reescribir el estado actual del backlog por bloques, con lo hecho y lo pendiente.
- [x] Registrar los tres refactores de la review de UI-09.
- [x] Evitar el fotograma con el formulario de crear carpeta: el efecto que reacciona al estado no actúa antes de que la vista arranque.
- [x] Selectores exactos y espera de la vista en el spec.
- [x] Verificar el spec en webkit.

## Evidencia y progreso

- Causa del fallo, en corto: `useSesionCarpeta` arranca con `"no-creada"`; el efecto que reacciona al estado se ejecutaba en el mismo commit que el de montaje y dejaba la vista en `crear`, así que se pintaba un fotograma con dos campos de contraseña antes de pasar a desbloquear. Con la guarda de montaje, la vista inicial la fija solo la consulta síncrona.
- `playwright test e2e/carpeta.spec.ts --project=webkit`: 5 de 5 en verde en esta máquina, donde antes fallaba siempre.

## Siguiente paso

Ninguno: es mantenimiento del proyecto y del arnés.

## Cambios de alcance aceptados

1. Se toca un componente del carril de interfaz porque el fallo hacía inestable la suite local y producía un parpadeo visible. Se avisa en el PR.
