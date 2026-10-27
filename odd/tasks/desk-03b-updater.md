# DESK-03b: actualizador automático sobre GitHub Releases

## Objetivo y motivo

Un descargable sin actualizaciones obliga a cada persona a volver a bajar el instalador en cada versión. Con el canal decidido (D-12, GitHub Releases), esta tarea conecta el actualizador: comprueba si hay versión nueva, avisa, descarga en segundo plano y pide permiso antes de reiniciar. Nunca instala nada sin que la persona lo acepte.

## Alcance y restricciones

- Dentro: `electron-updater` en `apps/desktop`, la configuración de publicación en GitHub, el flujo de aviso y reinicio, un modo de diagnóstico por línea de órdenes que comprueba actualizaciones sin abrir ventana, y el ritual de publicación documentado.
- Fuera: firma de código, macOS y Linux, y la interfaz de "novedades".
- Invariantes: sin telemetría; el actualizador solo habla con GitHub; la descarga no puede instalar sin consentimiento; el binario sigue sin llevar la clave de IA.

## Superficie de edición (nuestra)

`apps/desktop/**`, `.github/workflows/**` si hace falta para publicar, `docs/desktop.md`, `docs/backlog.md`, `odd/tasks/desk-03b-updater.md`.

## Modo TDD (nuestra)

- Activo: sí, sobre la lógica pura: cuándo se comprueba, cómo se decide el mensaje y que no se avise dos veces de la misma versión. El canal real se prueba publicando dos versiones de prueba y ejecutando el diagnóstico de la primera contra la segunda.

## Riesgo y review (nuestra)

- Tipo: entrega.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5. Un actualizador mal cableado puede instalar código que la persona no pidió o quedar en un bucle de avisos.

## Tareas

- [ ] `electron-updater` y configuración `publish` de GitHub en `electron-builder.yml`.
- [ ] Flujo: comprobar al arrancar (solo empaquetado), avisar si hay versión, descargar, pedir permiso para reiniciar.
- [ ] Modo `--check-updates` que imprime el resultado y sale, para verificar sin interfaz.
- [ ] Tests de la lógica pura y de que no se avisa dos veces.
- [ ] Documentación del ritual de publicación.
- [ ] Prueba real: publicar `v0.0.1` y `v0.0.2` de prueba y comprobar que la primera ve la segunda.

## Evidencia y progreso

Pendiente de rellenar.

## Siguiente paso

Cierra el ciclo del escritorio en Windows.

## Cambios de alcance aceptados

Ninguno.
