---
tarea: DOCS-01b
base: 7dfa4ef
revisado: c20d42c
revisor: jd-judge-b
veredicto: aprobado con cambios
---

## Resumen

El OCR cumple los criterios de DOCS-01b y los invariantes del proyecto: las tres rutas (`workerPath`, `corePath`, `langPath`) se pasan explícitas y de mismo origen, una base con origen se rechaza con error, `tesseract.js` entra solo con `import()` dinámico y el worker se reutiliza. Verifiqué contra el `worker.min.js` versionado (tesseract.js 7.0.0) que las rutas se usan como espera el paquete: `corePath` sin terminar en `js` hace que el worker añada la variante `-lstm` (las tres están versionadas, y con el `oem` por defecto `LSTM_ONLY` el flag `lstmOnly` es verdadero), `langPath` sin barra final más `spa.traineddata` sin `.gz` porque se pasa `gzip: false`, y `workerBlobURL: false` hace `new Worker("/ocr/worker.min.js")` directamente. Los ocho ficheros de `assets/ocr/` coinciden byte a byte con el tamaño y el sha256 de su README (los recalculé), y los tamaños de D-13 (13,6 MB modelo, 0,1 MB worker, 11,7 MB núcleos, 25,4 MB total) son los medidos. Tests y typecheck del paquete en verde (39 tests). No hay bloqueantes; queda un recomendado barato y tres notas.

## Hallazgos

### 1. [recomendado] packages/extract/test/ocr-assets.test.ts:63
Problema: la integridad de los binarios versionados solo se comprueba cuando alguien ejecuta `ocr:assets`: los tests verifican que los ficheros existen y que pesan más que unos umbrales sueltos (> 5 MB el modelo, > 1 MB los núcleos, > 10 KB el worker), pero nadie recalcula el sha256 de lo que hay en el repositorio contra el manifiesto del README. Un binario corrupto o mal sustituido (una fusión mal resuelta, un `ocr:assets` a medias tras subir `tesseract.js` de versión que renueva los núcleos pero no el modelo, o al revés) pasa toda la suite y rompe el OCR solo en el navegador, lejos de donde se puede depurar. El invariante "nada inventado: cada activo lleva su sha256" hoy se apoya en un proceso manual, no en un test.
Propuesta: un test que calcule el sha256 de cada fichero de `assets/ocr/` y lo compare con la tabla de `assets/ocr/README.md` (parseando la tabla o leyendo un manifiesto JSON al lado de los binarios). Fallaría con el fichero y el hash esperado en el mensaje.
Riesgo del cambio: bajo. Esfuerzo: S.

### 2. [nota] packages/extract/src/ocr.ts:129
Problema: hay una carrera de concurrencia en la sesión: si una llamada `extract` pide un idioma o base distintos mientras otra está en curso, la segunda llama a `cerrar()` y, durante ese `await`, una tercera llamada con la clave antigua puede intercalarse y dejar colgado un worker sin terminar (fuga de memoria y de trabajo wasm). Hoy es inalcanzable: solo se versiona `spa` y la app no mezcla idiomas en paralelo, y el único punto de entrada es el singleton de módulo. No hace falta arreglarlo ahora.
Propuesta: cuando exista el segundo idioma, serializar `obtenerWorker` con una promesa de cola, o documentar en `crearSesionOcr` que las llamadas concurrentes con claves distintas no están soportadas.
Riesgo del cambio: bajo. Esfuerzo: S. Si se documenta, basta un comentario; si se implementa, pasa a REF-DOCS-01b.

### 3. [nota] packages/extract/test/ocr.test.ts:82
Problema: la garantía de "sin red ajena" en tests descansa en el espía sobre `fetch` y en un cargador falso de `tesseract.js`. Eso es correcto para la orquestación propia, pero el espía no puede pillar una desconfiguración de tesseract.js misma: si una opción cambia de nombre en una futura versión (`workerPath`, `corePath`, `langPath`, `workerBlobURL`), el paquete la ignoraría en silencio y caería en sus valores por defecto de jsDelivr sin que ningún test de unidad lo vea. La prueba real solo puede ser el spec de Playwright con OCR verdadero, ya previsto para CARPETA-01, y el README lo declara sin probar.
Propuesta: nada en esta tarea. Al llegar CARPETA-01, el spec de Playwright debe interceptar cualquier petición a un origen distinto del propio y fallar (por ejemplo con `page.route("**/*")` comprobando el origen), no solo pasar si el OCR acierta.
Riesgo del cambio: ninguno ahora. Esfuerzo: M (en su tarea).

### 4. [nota] packages/extract/test/ocr.test.ts
Problema: el rechazo de bases con origen está bien probado en `resolveOcrAssets` (ocr-assets.test.ts:53), pero ningún test lo ejercita a través de la API pública (`extract` con `basePath: "https://..."`), que es el camino por el que vendrá el error en producción; hoy ese error se propaga sin envolver, lo cual es razonable, pero no está fijado por ningún test.
Propuesta: un test de dos líneas que afirme que `sesion.extract(imagen, { basePath: "https://cdn.example.net" })` rechaza con el mensaje de `propio origen` antes de llamar al cargador.
Riesgo del cambio: bajo. Esfuerzo: S.

## Comprobaciones propias

- `pnpm --filter @letra-grande/extract test`: 39 tests en verde. `pnpm --filter @letra-grande/extract typecheck`: limpio.
- sha256 y tamaño recalculados de los 8 ficheros de `assets/ocr/`: coinciden con la tabla de su README y con los hashes fijados en `scripts/fetch-ocr-assets.mjs`.
- Comportamiento de `worker.min.js` 7.0.0 verificado leyendo su código: construcción de la URL del núcleo (añade la variante `-lstm` cuando `corePath` no acaba en `js`, con las tres variantes presentes), de la URL del modelo (`langPath` sin barra final + `spa.traineddata`, sin `.gz` por `gzip: false`), lectura y escritura de caché activadas salvo `refresh` o `none` (con `write` se lee de IndexedDB), y `new Worker(workerPath)` directo con `workerBlobURL: false`. El `oem` por defecto de `createWorker` es `LSTM_ONLY`, así que `lstmOnly` es verdadero y nunca se pediría un núcleo no LSTM que no está versionado.
- Sin `any`, sin rayas largas ni medias rayas en código, tests y mensajes; errores en español tuteando y con `cause` conservado.
- Sin datos personales en fixtures ni tests; la única imagen de prueba es un `Blob(["foto"])` sintético.
- D-13 y la fila de ola 2 del backlog actualizadas con los números reales, que he verificado.

No ejecuté `pnpm check` ni `pnpm e2e` completos, según instrucciones.

## Qué se aplicó en la ronda de correcciones

- Hallazgo 1 (recomendado), aplicado: los activos ahora tienen un manifiesto versionado, `packages/extract/assets/ocr/manifest.json`, con nombre, bytes, sha256, origen y licencia de cada uno. Un test recalcula el sha256 y el tamaño de los ocho ficheros y falla nombrando el que no cuadra, y otro comprueba que lo que pide el código (`OCR_ASSETS`) está en el manifiesto. `scripts/fetch-ocr-assets.mjs` verifica cada copia y cada descarga contra el mismo manifiesto, en vez de llevar los hashes duplicados: subir `tesseract.js` de versión sin actualizar el manifiesto falla en el script y en la suite. Los tests de umbrales sueltos se sustituyeron por la comprobación de sha256; se quedó un umbral sobre el modelo solo para explicar el fallo si algún día se sustituye.
- Hallazgo 2 (nota), aplicada como documentación: `crearSesionOcr` dice que las llamadas concurrentes con idiomas distintos no están soportadas, por qué hoy no es alcanzable y que su arreglo queda como `REF-DOCS-01b` en el backlog.
- Hallazgo 4 (nota), aplicado: un test ejercita el rechazo de una base con origen a través de la API pública (`extract` con `basePath: "https://..."`) y fija que el cargador ni siquiera se llama.
- Hallazgo 3 (nota), sin código en esta tarea: queda escrito en el README del paquete y en el documento de tarea que el spec de Playwright de CARPETA-01 debe fallar ante cualquier petición a un origen ajeno, no solo comprobar que el texto es correcto.

Resultado: 40 tests en el paquete, `pnpm check` y `pnpm e2e` en verde, `odd/tasks/docs-01b-ocr.md` actualizado.
