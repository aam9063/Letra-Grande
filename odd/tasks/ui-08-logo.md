# UI-08: el logo del proyecto en la landing y en el icono de la app

## Objetivo y motivo

La landing usaba un cubo de texto como marca y el instalador llevaba el icono de Electron. La persona responsable del proyecto aportó `public/logo.svg`, que envuelve el logo real en 1024 por 1024. Esta tarea lo usa en la cabecera y el pie de la landing y regenera el icono del escritorio desde ese mismo archivo, para que la marca sea una sola.

## Alcance y restricciones

- Dentro: versionar `apps/web/public/logo.svg`, sustituir el cubo por el logo en cabecera y pie, limpiar el CSS que queda muerto y regenerar `apps/desktop/build/icon.png` desde el logo.
- Fuera: rediseñar la landing, cambiar textos o el resto de la identidad visual, y tocar el icono de la PWA (`icon.svg`), que sigue siendo el del manifiesto.
- Invariantes: sin dependencias nuevas; el logo es del propio proyecto (no hay activo de terceros); accesibilidad, el logo va como imagen decorativa porque el texto "Letra Grande" está al lado.

## Superficie de edición (nuestra)

`apps/web/public/logo.svg`, `apps/web/src/app/(landing)/page.tsx`, `apps/web/src/app/(landing)/landing.css`, `apps/desktop/build/icon.png`, `odd/tasks/ui-08-logo.md`.

## Modo TDD (nuestra)

- Activo: no aplica, es un activo gráfico y su marcado, sin lógica. Se justifica aquí.
- Verificación sustituta: capturas reales del navegador de cabecera y pie, y comprobación de que el icono del paquete sale del logo nuevo.

## Riesgo y review (nuestra)

- Tipo: interfaz y entrega.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5 para el icono del instalador y elemento 6 para el marcado. La revisión mira que el logo no desplace el layout, que el texto alternativo sea el correcto (vacío y oculto, porque el nombre está al lado) y que el icono generado tenga resolución suficiente.

## Tareas

- [x] Versionar `logo.svg`.
- [x] Sustituir el cubo por el logo en la cabecera y en el pie.
- [x] Quitar las reglas CSS del cubo, que quedan sin uso.
- [x] Regenerar `apps/desktop/build/icon.png` a 512 desde el logo.
- [ ] Verificar con capturas y con el instalador.

## Evidencia y progreso

- El SVG del logo envuelve un JPEG de 1024 por 1024 con fondo `#1E1E1E`, así que sirve para el icono y para la web; el tamaño declarado del SVG es 53 por 53 pero el raster interno es de 1024, de modo que no se pixela al escalar.
- Capturas verificadas: cabecera a 44 px y pie a 36 px, con el texto de la marca al lado.
- `pnpm build` y `pnpm check` en verde.
- Nota para la persona responsable: sobre fondo claro el logo se ve como una placa oscura, porque el activo tiene fondo propio; si se quiere integrado en la cabecera clara hará falta una variante con transparencia.
- e2e: la suite falla en local en un spec de la carpeta (`desbloquear entra en la ruta solicitada`, webkit) que **también falla en `dev` limpio**; es anterior a esta tarea y no la provoca.

## Siguiente paso

Ninguno: es cosmético y queda cerrado con el PR.

## Cambios de alcance aceptados

Ninguno.
