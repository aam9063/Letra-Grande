# OPS-08: cerrar las decisiones abiertas de cuentas, releases y OCR

## Objetivo y motivo

Tres decisiones llevaban semanas abiertas y bloqueaban trabajo real: la cuenta de usuario (D-06), dónde se publican los binarios del escritorio y cómo se sirven los datos de idioma del OCR. La persona responsable del proyecto delegó la elección en las recomendaciones técnicas, así que se escriben con su criterio y su consecuencia, para que nadie tenga que reconstruirlas.

## Alcance y restricciones

- Dentro: ampliar D-06 con el criterio de multidispositivo, añadir D-12 (publicación en GitHub Releases) y D-13 (datos de OCR versionados), y reflejar las tres en el backlog.
- Fuera: implementar el actualizador (`DESK-03b`) y el OCR (`DOCS-01b`), que son tareas propias.
- Invariantes: ninguna decisión cambia la promesa de privacidad; ninguna añade cuentas ni servidor con datos personales.

## Superficie de edición (nuestra)

`docs/ARRANQUE.md`, `docs/backlog.md`, `odd/tasks/ops-08-decisiones.md`.

## Modo TDD (nuestra)

- Activo: no, son decisiones documentadas. Se justifica aquí.
- Verificación sustituta: que cada decisión diga su motivo, su consecuencia y cuándo se revisa, y que el backlog deje de listar como bloqueado lo que ya tiene respuesta.

## Riesgo y review (nuestra)

- Tipo: producto y entrega.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5 (publicación de binarios) y elemento 2 (que una decisión sobre cuentas debilite la privacidad). La revisión mira que D-06 no abra la puerta a un servidor con datos y que las tres decisiones sean coherentes con lo ya implementado.

## Tareas

- [x] D-06: sin cuentas, contraseña del vault como autenticación, copia cifrada como multidispositivo y sincronización ciega solo con criterio explícito.
- [x] D-12: GitHub Releases como canal de publicación.
- [x] D-13: datos de idioma del OCR versionados en el repositorio.
- [x] Backlog: DESK-03b y DOCS-01b dejan de estar bloqueados y nombran su decisión.

## Evidencia y progreso

- D-06 ampliada: deja escrito que no hay registro de usuarios, que el multidispositivo hoy es la copia cifrada, y que si se demuestra necesidad será sincronización ciega con revisión legal, nunca un login con datos en servidor. Añade el criterio para reconsiderar: más de una quinta parte de las personas pidiendo multidispositivo, o el caso del familiar que gestiona papeles de otra persona.
- D-12: GitHub Releases por coste cero, versionado y manifiesto de actualización servido desde la propia release, sin infraestructura que mantener.
- D-13: unos 15 MB de datos de idioma en el repositorio a cambio de que el OCR funcione sin conexión desde el primer uso; se cargan solo al subir una foto.

Ronda de correcciones aplicada tras la review:

- Las filas D-12 y D-13 no se habían insertado: la comprobación buscaba la cadena "D-12" en el texto y la encontró dentro de `MOD-12`, así que saltó la inserción. Es la tercera vez que ese atajo me falla hoy; ahora el ancla es la fila exacta.
- El criterio de reconsideración de D-06 pasa a ser medible sin analítica: veinte o más peticiones escritas en seis meses por el canal de contacto del repositorio.
- D-13 nombra el modelo (`best` de español, unos 15 MB) y resuelve el conflicto con el criterio de red de DOCS-01: el PDF no hace ninguna petición, el OCR descarga una vez del propio origen y el test falla si aparece un origen ajeno.
- D-01 queda marcada como decidida (acento de la marca y Host Grotesk autoalojada, ya aplicados) y sale de las tareas humanas pendientes. La sección 19 pasa a titularse "Decisiones de producto".

Informe en `odd/reviews/ops-08.md`.

## Siguiente paso

Desbloquea DESK-03b y DOCS-01b.

## Cambios de alcance aceptados

Ninguno.
