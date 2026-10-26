# DESK-00: decisión y plan del escritorio con Electron

## Objetivo y motivo

Definir el descargable de escritorio antes de escribir código: qué envoltorio, qué alcance inicial, de dónde sale la clave de IA y qué exige cada sistema. La decisión se tomó con la persona responsable del proyecto: Electron, Windows primero, y el asistente llamando al proxy alojado.

## Alcance y restricciones

- Dentro: `docs/desktop.md` con la decisión, la arquitectura, la seguridad del envoltorio, las diferencias con la PWA, los cambios de código necesarios, las pruebas, el estado de Windows y lo que exigen macOS y Linux; la fila D-11 en el documento de arranque; las tareas `DESK-01` a `DESK-04` en el backlog; y los punteros desde `ARCHITECTURE.md` y el README.
- Fuera: implementar nada. Esta tarea solo decide y documenta.
- Invariantes del proyecto que aplican: la clave de IA nunca viaja en un binario; los datos personales siguen en el dispositivo; sin telemetría ni terceros; el asistente solo recibe texto enmascarado.

## Superficie de edición (nuestra)

`docs/desktop.md`, `docs/ARRANQUE.md`, `docs/backlog.md`, `docs/ARCHITECTURE.md`, `README.md`, `odd/tasks/desk-00-decision.md`.

## Modo TDD (nuestra)

- Activo: no, es una decisión documentada sin comportamiento ejecutable. Se justifica aquí.
- Verificación sustituta: contraste con el código real (que el build de la web es de servidor y por eso la exportación estática es un trabajo aparte), y consulta de las condiciones de distribución de cada sistema antes de escribir los números de macOS.

## Riesgo y review (nuestra)

- Tipo: decisión de producto y de entrega.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 5 (entrega y entorno) y elemento 2 (si la clave acabara en el binario). La revisión mira que la regla de la clave no tenga excepciones y que lo que se afirma de cada sistema sea cierto y verificable.

## Tareas

- [x] Decidir envoltorio, alcance y relación entre escritorio, PWA y proxy.
- [x] Escribir `docs/desktop.md` con arquitectura, seguridad, cambios necesarios y estado por sistema.
- [x] Añadir D-11 al documento de arranque y las tareas DESK al backlog.
- [x] Enlazar desde `ARCHITECTURE.md` y el README.

## Evidencia y progreso

Decisión registrada: Electron con `electron-builder`, Windows primero con instalador NSIS, el binario sin clave y el asistente contra el proxy alojado, y la PWA intacta.

Datos de macOS verificados antes de escribirlos, porque cambian: distribuir fuera del App Store no requiere licencia, pero firmar y notarizar sí exige el Apple Developer Program de 99 USD al año, y desde macOS 15 ya no sirve el atajo de clic derecho y abrir: el usuario tiene que ir a Ajustes del Sistema, Privacidad y Seguridad, y pulsar "Abrir igualmente". El actualizador automático de macOS también exige app firmada.

Detalle técnico que condiciona la implementación y queda escrito: el renderer no se puede servir con `file://`, porque Chromium le da un origen opaco y deja IndexedDB y WebCrypto poco fiables. Va por un protocolo propio, `app://letra-grande`.

Ronda de correcciones aplicada: la fila D-11 ya existe en el documento de arranque (el guard anterior se confundió con `MOD-11`), reglas de permisos y de confianza del canal de actualización añadidas, corrección del actualizador en Linux, el `webpack` de `extensionAlias` se mantiene en las dos salidas y el mecanismo de detección de escritorio queda nombrado. Informe en `odd/reviews/desk-00.md`.

## Siguiente paso

`DESK-01`, el build de dos salidas en `apps/web`, que es el cambio más delicado y no toca ni la PWA ni la ruta de API.

## Cambios de alcance aceptados

1. Solo Windows en el alcance inicial. macOS y Linux quedan en `DESK-04` porque exigen firma y, en macOS, la licencia de Apple.
