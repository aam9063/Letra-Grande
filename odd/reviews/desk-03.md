# Review gate DESK-03: instalador de Windows y canal de entrega

---
tarea: DESK-03
base: ff75199
revisado: 7b3f2a1
revisor: jd-judge-b (contexto limpio, solo lectura, artefacto real inspeccionado)
veredicto: aprobado con cambios
---

## Resumen

El paquete contiene exactamente lo que debe: el asar con el código compilado y `package.json`, sin pruebas, sin fuentes TypeScript, sin mapas de código y sin `node_modules`, y el renderer una sola vez en `resources/renderer`, fuera del asar. La resolución de la raíz es correcta en los tres escenarios: repositorio en desarrollo, `win-unpacked` e instalación real, comprobada contra el diseño que produce el empaquetador. Si falta el directorio, la app muestra un diálogo con la ruta y cierra, en vez de abrir una ventana vacía. La configuración es estable (`appId`, x64 declarado como límite honesto, nombre de artefacto predecible, `--publish never`). El aislamiento de la ventana no cambia con el empaquetado: el guard sigue confinando toda petición a la raíz resuelta. Los 116 MB son el runtime de Electron; no hay nada recortable sin romper la app. La cadena de suministro está documentada donde un mantenedor la ve. Sin clave de IA, sin telemetría, sin secretos en el asar.

## Hallazgos

### 1. [recomendado] docs/desktop.md:59

Problema: la sección 4 decía que la ruta de la copia cifrada y el evento de actualización llegarían "con DESK-03", y esta tarea los excluye a propósito: van con el canal de actualización.
Propuesta: corregir el calendario. Aplicado: ahora remite a DESK-03b.

### 2. [nota] docs/desktop.md, sección 8

Problema: no decía qué descarga el empaquetado ni qué pasa sin red.
Propuesta: añadirlo. Aplicado: se nombran el zip de Electron, NSIS y las herramientas de 7zip desde GitHub, y se avisa de que sin conexión el empaquetado falla.

### 3. [nota] apps/desktop/src/config.ts

Problema: la sobrecarga de la raíz del renderer por variable de entorno se aplicaba también en la app empaquetada, de modo que el instalado podía servir otro directorio. El guard seguía confinado a esa raíz, así que no escapaba, pero una variable de entorno no debe cambiar qué archivos sirve una aplicación distribuida.
Propuesta: ignorarla en el paquete y cubrirlo con pruebas. Aplicado: `rendererDistOverride` devuelve indefinido cuando `isPackaged`, con dos tests (se ignora en el paquete, se aplica en desarrollo recortando espacios).

### 4. [nota] higiene del paquete

`files` declara `package.json` de forma redundante y la exclusión de pruebas en `dist` cubre solo el primer nivel, que hoy es plano. Sin efecto; se deja como está para no complicar la configuración.

## Code smells

Ninguno relevante: la lógica de la raíz es pura y está probada, y el proceso principal queda claro. Sin secretos.

## Qué se aplicó en la ronda de correcciones

Los hallazgos 1, 2 y 3. Resultado: 36 tests en `apps/desktop` y `pnpm check` en verde.
