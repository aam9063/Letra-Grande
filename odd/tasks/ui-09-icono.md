# UI-09: el icono del logo, recortado del lockup

## Objetivo y motivo

UI-08 puso `logo.svg` en la cabecera y en el pie, y se vio el problema en pantalla: ese archivo no es un icono, es el logotipo completo sobre un lienzo blanco de 1024 por 1024, con el texto "Letra Grande" debajo y márgenes amplios. A 44 px el resultado era un cuadro casi blanco con una mancha, repitiendo además el nombre que ya está al lado.

## Alcance y restricciones

- Dentro: recortar solo el icono (documento con lupa y candado) del lockup, quitarle el blanco para que se apoye en cualquier fondo, usarlo en cabecera y pie y regenerar el icono del escritorio desde ese recorte.
- Fuera: rediseñar la marca, y el lockup completo, que sigue disponible en `logo.svg` para usos grandes.
- Invariantes: sin dependencias nuevas; un solo origen, el SVG original; el recorte se genera con el navegador que ya está en el proyecto.

## Superficie de edición (nuestra)

`apps/web/public/logo-icono.png`, `apps/web/public/logo-96.jpg` (se retira), `apps/web/src/app/(landing)/page.tsx`, `apps/desktop/build/icon.png`, `odd/tasks/ui-09-icono.md`.

## Modo TDD (nuestra)

- Activo: no aplica, es un activo gráfico derivado. Se justifica aquí.
- Verificación sustituta: captura real del navegador a 44 px y comprobación de dimensiones del icono del paquete.

## Riesgo y review (nuestra)

- Tipo: interfaz y entrega.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 6. Que el recorte se coma parte del icono o que el blanco deje halos al quitarse.

## Tareas

- [x] Detectar el recuadro del icono por barrido de píxeles, sin incluir el texto.
- [x] Recortar con margen y quitar el blanco con umbral suave.
- [x] Usar `logo-icono.png` en cabecera y pie.
- [x] Regenerar `apps/desktop/build/icon.png` desde el recorte.
- [x] Verificar con captura real.

## Evidencia y progreso

- Recuadro detectado en el lienzo: 338,223 a 708,613, es decir 371 por 391 px, que corresponde al icono y excluye el texto.
- `logo-icono.png`: 128 por 128, 18,9 KB. `apps/desktop/build/icon.png`: 512 por 512.
- Captura de la cabecera: el icono se ve a 44 px, con el texto al lado, sin marco blanco.
- `logo.svg` se conserva como fuente; ningún page lo referencia, así que no pesa en la portada.

## Siguiente paso

Ninguno: la marca queda coherente en web, escritorio y landing.

## Cambios de alcance aceptados

Ninguno.
