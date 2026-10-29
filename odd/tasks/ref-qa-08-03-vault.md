# REF-QA-08-03: el vault no viaja en la primera carga

## Objetivo y motivo

Sale del pase de arquitectura de la ola (`odd/reviews/ola-2.md`, hallazgo 3). El código del vault (PBKDF2, AES-GCM, IndexedDB, copia y purga) está en la primera carga de nueve rutas que no lo usan: ajustes, asistente, ayudas, carpeta, datos, familia, hoy, reclamar y vida. La causa es `apps/web/src/components/carpeta/sesion.ts:4`, que importa `openVault` de forma estática, y el shell lo consume para mostrar el estado de la carpeta en la barra y en la hoja «Más».

Pesa 2.9 KiB gzip, así que esto **no es una tarea de rendimiento**: es de acoplamiento. El código de descifrado y de purga no debería descargarse en la pantalla que muestra los datos de un organismo. Y con el presupuesto recién afinado en REF-QA-08-02, cada kilobyte de más en nueve rutas es margen que se le quita a la guarda.

## Alcance y restricciones

- Dentro:
  - `sesion.ts` importa del vault **solo tipos** y carga el módulo con `import()` en el momento de crear o desbloquear.
  - Un test que impide volver al import estático, porque el acoplamiento no lo detecta ningún otro test.
  - Medición del antes y el después sobre la build real.
- Fuera:
  - Cambiar el paquete `vault` ni su API.
  - Tocar el comportamiento de la carpeta: crear, desbloquear y bloquear siguen exactamente igual para quien usa la app.
  - Mover el estado de la carpeta a otro sitio: el shell lo sigue consultando igual.
- Invariantes: la clave derivada sigue viviendo solo dentro del `Vault`, en memoria; nada nuevo se persiste; sin red nueva.

## Superficie de edición

`apps/web/src/components/carpeta/sesion.ts`, `apps/web/src/components/carpeta/`, `apps/web/perf/budget.json`, `docs/rendimiento.md`, `docs/backlog.md`, `odd/tasks/ref-qa-08-03-vault.md`, `odd/reviews/ref-qa-08-03.md`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest` para el test que ancla el import ligero, `playwright` (spec de carpeta) para comprobar que el flujo real sigue igual, y `node --test` de los scripts para el presupuesto.
- RED: el test estático falla mientras `sesion.ts` importe el vault en runtime.

## Riesgo y review (nuestra)

- Tipo: privacidad y UI (el vault guarda datos personales en el dispositivo).
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 1 si la carga diferida dejara el vault en un estado raro y la clave se quedara en memoria más de lo previsto; elemento 6 si el flujo de la carpeta se rompe sin que el e2e lo note. Mitigación: el spec de carpeta cubre crear, desbloquear, bloquear y el error de contraseña, y el test estático impide que el acoplamiento vuelva.

## Tareas

- [x] Documento de funcionalidad antes del primer código.
- [x] Medir el antes: qué chunk lleva el vault y en qué rutas.
- [x] RED: test que exige que `sesion.ts` no importe el vault en runtime.
- [x] Carga bajo demanda en `sesion.ts`.
- [x] Medir el después y ajustar el presupuesto si baja.
- [x] `pnpm check` y `pnpm e2e` en verde.
- [x] Review gate con informe en `odd/reviews/ref-qa-08-03.md` y una ronda de correcciones.
- [x] Backlog actualizado y PR.

## Evidencia y progreso

Rama `lg/ref-qa-08-03-vault`, sobre `dev` (0418c16).

### Antes y después

| Qué | Antes | Después |
|---|---|---|
| Rutas con el vault en la primera carga | 9 | 2 (`/carpeta` y `/ajustes`) |
| Primera carga de esas siete rutas | 139.8 KiB | 136.9 KiB |
| Suma de las once rutas | 1527.1 KiB | 1509.6 KiB |

El vault sigue en `/carpeta` y en `/ajustes` porque son las dos pantallas que lo necesitan: una abre la carpeta y la otra tiene el borrado total. Dejarlo fuera de ahí exigiría diferir también esos componentes, y eso ya es otra tarea.

### Qué cambió

`sesion.ts` importa del paquete **solo tipos** (`import type { Vault, VaultTimer, openVault }`) y resuelve el módulo con `await import()` dentro de `abrirSesion`, es decir, la primera vez que alguien crea o desbloquea la carpeta. El flujo no cambia: `crear` y `desbloquear` comparten la misma función, `marcarExiste` sigue corriendo solo después de abrir bien, y `bloquear` y el bloqueo por inactividad no se tocan.

### El test que ancla la decisión

`sesion-ligero.test.ts` no comprueba comportamiento, sino que el import estático no vuelva, porque ninguna otra prueba lo detectaría. La primera versión era burlable y el review lo señaló: comillas simples, un reexport desde un módulo puente y un `await import` a nivel de módulo. La versión final exige que no haya ningún import de valor del paquete (comillas simples o dobles, multilínea, `export ... from` o `require`), que exista el `import type`, que el `import()` esté **dentro** de `abrirSesion` y que no aparezca antes.

### Presupuesto

Con las siete rutas 2.9 KiB más ligeras, se rebajaron sus límites de 153.5 a 150.4 KiB y el total a 1570 KiB, para no regalar el margen recién ganado. El margen por ruta queda entre 13.5 y 16.7 KiB y el total sigue por debajo de la suma de máximos (1570 contra 1670 KiB).

### Un tropiezo, contado

El primer test reforzado fallaba por dos motivos que eran del propio test y no del código: el patrón arrancaba desde un comentario que menciona la palabra "import", y después cruzaba de un import a otro saltando el fin de sentencia. Los dos arreglados anclando a inicio de línea y sin cruzar `;`.

