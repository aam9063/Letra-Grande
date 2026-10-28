# Accesibilidad (QA-02)

Qué se comprueba solo, qué se comprueba a mano y cómo se hace cada cosa. El criterio del proyecto es AA: no es una aspiración, es un requisito que la CI vigila.

## Lo que comprueba la CI

Todo corre dentro de `pnpm e2e`, así que no hay ningún job nuevo que recordar: si el e2e está en verde, la accesibilidad automática también.

`apps/web/e2e/accesibilidad.spec.ts`, sobre las once rutas de la app (portada, hoy, carpeta, asistente, ayudas, datos, familia, reclamar, vida, ajustes y onboarding):

1. **axe con las etiquetas `wcag2a` y `wcag2aa`.** Falla con la lista de violaciones, su impacto y el selector de cada nodo afectado.
2. **El spec se comprueba a sí mismo.** Un test inyecta un HTML roto conocido (una imagen sin `alt` y un botón sin nombre) y exige que axe lo detecte. Sin esto, un motor mal configurado o un DOM a medio montar daría verde sin analizar nada.
3. **Zoom al 200 %.** WCAG 1.4.4 pide que el texto escale al doble sin perder contenido ni funcionalidad. Con zoom al 200 % en un escritorio de 1280 px el navegador calcula el layout con 640 px de ancho en CSS, así que se prueba ese ancho en vez de manipular el zoom, que no es estándar en todos los motores. En móvil se prueba el suelo real del proyecto, 375 px: el 200 % ahí daría 187 px, que ningún teléfono tiene. En cada ruta se exige que no haya scroll horizontal y que el título siga visible y dentro del ancho.
4. **Movimiento reducido.** Con `prefers-reduced-motion: reduce`, ningún elemento del DOM puede tener una animación o transición de más de 0.01 s, que es lo que deja la regla global de `globals.css`.

Y ya estaban, en los specs de interfaz: sin scroll horizontal a 375 px en el shell, la portada y el onboarding, y el objetivo de 44 px más el foco visible del sistema de diseño en `packages/design`.

## Añadir una ruta nueva

La lista `RUTAS` del spec es la fuente de verdad. Cuando entre una pantalla nueva, se añade su ruta ahí y ya queda cubierta por las cuatro comprobaciones. Si una ruta necesita un estado previo (una carpeta desbloqueada, por ejemplo), se prepara en el test, no se salta la comprobación.

## Desactivar una regla de axe

Una regla solo se desactiva cuando es un falso positivo del motor y no un problema real, con el motivo escrito al lado en el spec. Si la regla señala algo que de verdad molesta a quien usa la app, se corrige el código: bajar el nivel de exigencia para que el test pase es exactamente lo que esta tarea quiere impedir.

## Lo que ningún test puede comprobar: el recorrido manual

axe y los tests de layout no detectan si un texto alternativo describe bien la imagen, si el orden de lectura tiene sentido, si el foco se queda atrapado en un diálogo o si el lector anuncia algo confuso. Eso se comprueba a mano y **todavía no se ha hecho**: queda registrado como comprobación humana pendiente en `docs/backlog.md`, igual que H-07 con las fichas.

Procedimiento, unos 15 minutos por pantalla:

1. **Recorrido con teclado.** Solo con `Tab`, `Shift+Tab`, `Enter`, `Espacio` y `Escape`: llegar a todo, ver el foco siempre visible y en un orden que siga la pantalla. El foco no puede escaparse de la página ni quedarse atrapado donde no toca.
2. **Lector de pantalla.** NVDA con Firefox o Chrome en Windows; VoiceOver con Safari en macOS; TalkBack en Android. Comprobar que se anuncia el título de la pantalla, que los grupos de navegación tienen nombre, que cada campo anuncia su etiqueta y su ayuda, y que los avisos de error se leen cuando aparecen.
3. **Los tres flujos que más importan**, porque son los que hacen algo con datos: crear la carpeta y desbloquearla, cambiar el tamaño de letra en Ajustes, y el borrado total con contraseña.
4. **Anotar en la ficha de la tarea** qué se probó, con qué navegador y lector, y qué falló. Un fallo encontrado aquí se arregla o se registra como tarea, nunca se deja sin anotar.

Mientras ese recorrido no exista, la accesibilidad de la app está comprobada en lo automático y **no** en lo que depende de una persona escuchando la interfaz. Decirlo así es más honesto que dar AA por cerrado.

## Por qué el nivel AA y no las mejores prácticas

Con las etiquetas de mejores prácticas la lista crece con cosas que no son un requisito del proyecto, y el ruido hace que la gente deje de mirar el fallo. AA es lo que se promete y lo que se comprueba.
