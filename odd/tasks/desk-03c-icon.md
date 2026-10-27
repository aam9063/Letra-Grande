# DESK-03c: icono de la aplicación en el ejecutable y el instalador

## Objetivo y motivo

El empaquetado avisaba `default Electron icon is used`: el instalador y el ejecutable salían con el icono de Electron. Es lo primero que ve una persona al descargar y al buscar la app en el menú de inicio, y no representa al producto.

## Alcance y restricciones

- Dentro: un PNG de 512 por 512 generado desde el icono de la PWA, su declaración en `electron-builder` y la nota de cómo regenerarlo.
- Fuera: rediseñar la identidad visual; el icono es el que ya usa la PWA.
- Invariantes: sin dependencias nuevas; el artefacto se versiona porque el empaquetado no debe exigir navegadores instalados.

## Superficie de edición (nuestra)

`apps/desktop/build/icon.png`, `apps/desktop/electron-builder.yml`, `docs/desktop.md`, `odd/tasks/desk-03c-icon.md`.

## Modo TDD (nuestra)

- Activo: no aplica, es un recurso y una línea de configuración, sin lógica. Se justifica aquí.
- Verificación sustituta: empaquetar y comprobar que el aviso de icono por defecto desaparece del registro y que el tamaño del ejecutable cambia.

## Riesgo y review (nuestra)

- Tipo: entrega.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5. Un icono mal formado hace fallar el empaquetado o produce un binario sin icono legible.

## Tareas

- [x] Generar el PNG de 512 desde `apps/web/public/icon.svg` con Playwright, sin añadir dependencias.
- [x] Declararlo en `electron-builder.yml` para Windows.
- [x] Documentar el comando de regeneración.
- [x] Verificar que el aviso desaparece y que el binario se genera.

## Evidencia y progreso

- PNG de 512 por 512, 9,2 KB, generado con `playwright screenshot` desde el SVG de la PWA.
- Antes: el registro decía `default Electron icon is used  reason=application icon is not set`.
- Después: cero apariciones de ese aviso, y el ejecutable crece unos 7 KB respecto al paquete sin icono, coherente con el icono incrustado. El revisor extrajo además el icono del binario: la esquina es `#3E9B94`, el verde de la marca.

## Siguiente paso

`DESK-03b` (actualizador) cuando exista canal de publicaciones.

## Cambios de alcance aceptados

Ninguno.
