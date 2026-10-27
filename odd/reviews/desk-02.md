# Review gate DESK-02: ventana Electron con protocolo propio

---
tarea: DESK-02
base: e63a79a
revisado: 596cffc
revisor: jd-judge-a (contexto limpio, solo lectura, tests y check ejecutados)
veredicto: aprobado con cambios
---

## Resumen

El aislamiento es correcto: `sandbox`, `contextIsolation` y `nodeIntegration: false`, sin herencia de preferencias porque hay una sola ventana y las nuevas se deniegan. El preload expone tres campos primitivos congelados por `contextBridge`, sin `ipcRenderer` ni `require`. El protocolo resiste los ataques probados: `..%2f`, `%2e%2e`, barras invertidas, byte nulo, host ajeno y URL rota se rechazan; la doble codificación y una ruta con letra de unidad caen al respaldo sin salir de la raíz, y no hay listados de directorio. La CSP con hashes se recalcula por petición sobre el fichero servido, sin caché, así que ningún texto inyectado ejecuta. Navegación: solo `app://letra-grande` dentro; `http` y `https` se delegan al navegador del sistema. Permisos: todos denegados, incluidos portapapeles y notificaciones, con test. Los 24 tests son de comportamiento y detectarían una regresión de traversal o de política. Sin clave, sin telemetría, sin `any`, comentarios en español, sin rayas, y las dependencias son exactamente Electron, el empaquetador, TypeScript y Vitest. La nota nueva de `docs/review-gate.md` describe con coherencia las dos trampas del gate.

## Hallazgos

### 1. [recomendado] apps/desktop/tsconfig.json:8

Problema: `@types/node` no está declarado y se resuelve por `typeRoots` hacia el directorio hoisteado de pnpm. Hoy funciona, pero un cambio de hoisting, un lockfile distinto o una instalación limpia en otra máquina rompen el typecheck.
Propuesta: declararlo como dependencia de desarrollo. Aplicado.

### 2. [recomendado] apps/desktop/src/main.ts:60

Problema: la segunda barrera de traversal es léxica y no resuelve enlaces simbólicos, así que un symlink dentro del renderer que apunte fuera se serviría. El contenido es de confianza porque lo genera el build, así que no es explotable hoy, pero la barrera promete más de lo que hace.
Propuesta: resolver con `fs.realpath` y comparar contra la raíz real. Aplicado, con test que crea un enlace fuera de la raíz y exige el rechazo.

### 3. [nota] apps/desktop/src/csp.ts:5

Problema: `style-src 'unsafe-inline'` se aparta de la CSP estricta prometida en `AGENTS.md`.
Propuesta: justificarlo por escrito, ya que los atributos de estilo vienen del prerender, los scripts siguen protegidos por hash y `img-src` y `connect-src` son `self`, de modo que una inyección de CSS no puede exfiltrar. Aplicado en el módulo y en `docs/desktop.md`.

### 4. [nota] pnpm-workspace.yaml:10

Problema: `electron-winstaller` estaba en la lista de scripts permitidos sin ser dependencia declarada de ningún paquete.
Propuesta: dejar solo lo instalado hoy y añadir lo que pida el instalador cuando llegue su tarea. Aplicado.

### 5. [nota] apps/desktop/src/preload.cts:26

Problema: el preload expone tres campos y la sección 4 de `docs/desktop.md` prometía también la ruta de la copia cifrada y el evento de actualización.
Propuesta: mantener la superficie mínima y corregir el documento para que no prometa lo que el código todavía no hace. Aplicado.

### 6. [nota] apps/desktop/src/inline-scripts.ts:15

Problema: la expresión regular solo reconoce un `<script>` sin atributos; uno con atributos no se hashea y la CSP lo bloquea. Es seguro porque falla cerrado, pero nadie lo estaba fijando.
Propuesta: un test que lo documente como comportamiento deliberado. Aplicado.

## Olores de código

`extractRawPath` recalcula cortes ya hechos y el manejador usa funciones síncronas de sistema de archivos, con una ventana TOCTOU inocua porque las rutas ya están saneadas léxicamente. Sin secretos.

## Qué se aplicó en la ronda de correcciones

Los seis hallazgos. Resultado: la superficie del preload y el documento coinciden, la allowlist de scripts de instalación queda acotada a lo que está instalado y el typecheck deja de depender del hoisting de pnpm.
