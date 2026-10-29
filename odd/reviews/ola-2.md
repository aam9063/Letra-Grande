# Pase de arquitectura de la Ola 2

Pase de conjunto sobre lo construido, no sobre lo pendiente. Las reviews por tarea están en `odd/reviews/<id>.md`; esto es la vista de arquitectura: duplicación entre carriles, grafo de dependencias, tamaño de bundle y nombres.

**Alcance, dicho sin adornos:** la Ola 2 no está cerrada. Faltan RADAR-02 (interfaz de Hoy), AI-03 (pantalla del chat), AI-04 (evaluaciones) y MOD-01 a MOD-03. Este pase cubre lo que hay en `dev` hoy: el escritorio, siete pantallas de interfaz, cuatro módulos de extracción, el radar de plazos, el asistente y las tres tareas de calidad (QA-01, QA-02 y QA-05). **No arregla nada**: cada hallazgo se convierte en una tarea `REF-` y se queda ahí.

## Método

Dos auditorías independientes de solo lectura, una por duplicación y nombres y otra por dependencias y bundle, y contraste de cada afirmación contra el código antes de publicarla. Las cifras de tamaño están medidas sobre la build que existe en `apps/web/.next` (`.next/static/chunks`, gzip calculado con zlib) y las de primera carga son las que mide `scripts/check-bundle-budget.mjs` en la CI.

El contraste sirvió: dos afirmaciones de las auditorías no se sostenían tal cual y aparecen corregidas aquí (el peso del vault y las líneas del barrel de `extract`).

## Hallazgos, por gravedad

### 1. Los tokens de diseño viven en tres sitios y los literales campan a sus anchas

`packages/design/src/tokens.ts:16-30` se declara fuente de verdad. Pero `packages/design/src/base.css:8-20` repite los mismos colores como custom properties, y `apps/web/src/app/globals.css:2-6` vuelve a declarar cinco de ellos. Las dos hojas se cargan en la misma página (`apps/web/src/app/layout.tsx:7-8`), así que la redeclaración no es inocua: gana la última. Ya hay una divergencia visible, el lienzo está como `#F7F7F8` en `base.css:9` y como `#f7f7f8` en `globals.css:3`.

Dos de esas redeclaraciones no son deriva: `globals.css:7-8` cambia `--lg-espacio` de `1rem` a `0.25rem` y `--lg-radio` de `8px` a `0.5rem`, y el comentario de `layout.tsx:5-6` dice que la hoja de la app va después justamente para ganar. Es un override deliberado, y por eso la tarea de deuda tiene que decidir si se queda como override explícito o se convierte en tokens propios, no borrarlo sin más.

Y el uso: `apps/web/src/app/(landing)/landing.css` escribe los colores de marca a mano 14 veces (`#141414`), 17 veces (`#ffffff`), 15 veces (`#e3e3e8`) y solo usa `var(--lg-`) en dos sitios. `onboarding.css` hace lo mismo con `#55555f` y `#e3e3e8`, y `globals.css` lleva 26 literales hex.

Hay además cuatro colores que no son tokens y están copiados en tres hojas: `#135c2e`/`#e6f4ea` y `#e3f2f1`/`#17504b` aparecen en `landing.css:320-326`, en `onboarding.css:175` y en `globals.css:226-227` y `242-243`. Son las etiquetas de estado de la portada. No están en `tokens.ts`: los tonos del sistema son otros (`exito` es `#E7F4EA`/`#14532D` y `aviso` es `#FDF3D7`/`#6B4B00`), así que no es una copia mal hecha de los tokens sino una paleta paralela que nació fuera del sistema y se replicó a mano.

Coste: cambiar un color de marca exige tocar tres o cuatro ficheros y recordar los literales; si se olvida uno, la pantalla se queda con el color viejo y el test de contraste de `packages/design/test/contrast.test.ts` no lo ve, porque solo mide los tonos de `tokens.ts`.

### 2. El presupuesto de rendimiento cuenta polyfills que nadie descarga

`polyfills-42372ed130431b0a.js` pesa 110.0 KiB crudos y 38.7 KiB gzip, y en el HTML va con `noModule=""` (`/hoy.html`), así que un navegador que soporta módulos no lo descarga. `scripts/check-bundle-budget.mjs` suma todo `src="/_next/...js"` sin mirar ese atributo, de modo que cada ruta presupuesta 38.7 KiB gzip de más: sobre una primera carga de 169.5 a 181.1 KiB, es entre el 21 % y el 23 % de la cifra.

Coste: el presupuesto es más conservador de lo necesario y, peor, mide un recurso que no se pide. Un presupuesto que no mide lo que el navegador descarga deja de ser un presupuesto.

### 3. El código del vault viaja en nueve rutas que no lo usan

El chunk `342-3407b7356c91040e.js` contiene el vault (PBKDF2, AES-GCM, IndexedDB) y está en la primera carga de ajustes, asistente, ayudas, carpeta, datos, familia, hoy, reclamar y vida. Lo arrastra el estado de carpeta del shell: `apps/web/src/components/carpeta/sesion.ts:4` importa `openVault` de forma estática. Rutas como `/datos` o `/vida` nunca abren la carpeta.

Peso real medido: **7.9 KiB crudos, 2.9 KiB gzip**. La auditoría lo presentó como el hallazgo gordo de rendimiento y no lo es: el coste es pequeño porque el trabajo pesado lo hacen WebCrypto e IndexedDB, no el código propio. Lo que sí es un defecto es de acoplamiento y de higiene: el código de descifrado y de purga no debería estar en la ruta que muestra los datos de un organismo. La landing no lo carga.

### 4. La normalización de tildes está tres veces en el mismo paquete

`packages/ai/src/guardrails/tone.ts:41-46` y `packages/ai/src/guardrails/staleness.ts:52-58` tienen una función `normalizar` idéntica, y el comentario de la segunda dice "igual que el tono": la igualdad se mantiene a mano. Una tercera variante vive en `packages/ai/src/retrieval/tokenize.ts:29-31` (el mapa `DIACRITICOS`, usado en `:49-56`), con un mapa explícito en vez de `NFD`.

Coste: si mañana hay que tratar diéresis o ligaduras, se arregla en un sitio y no en los otros dos, y las comparaciones de tono y de caducidad pueden divergir en silencio.

### 5. Limpieza menor, sin coste hoy

- `zod` está declarado en `packages/ai/package.json:18` y no se usa: cero coincidencias en `packages/ai/src` y `packages/ai/test`.
- `react-dom` es `dependency` de `@letra-grande/design`, y solo lo usan `client.ts` y la galería, no los componentes.
- `apps/web/src/test/setup.ts` y `packages/design/test/setup.ts` son idénticos.
- Cinco documentos de `odd/tasks` van en mayúsculas (`UI-03-landing.md` a `UI-07-carpeta.md`) frente al resto. No rompe el gate, que compara en minúsculas (`scripts/check-review-report.mjs:25,33`), pero confunde al buscar y en un sistema de ficheros sensible a la caja cualquier referencia escrita a mano falla.
- En `packages/extract/src/index.ts:142-156` conviven exports en español (`camposParaVault`, `parsearFecha`, `parsearNumero`) con otros en inglés (`extractInvoiceFields`, `classifyDocument`). `packages/radar/src/index.ts` mezcla igual, y sus valores de `UnidadPlazo` van en snake_case mientras el resto del monorepo es camelCase. El esquema es inglés consistente y es contrato: eso está bien y no se toca.

## Lo que está sano, con la evidencia de haberlo mirado

- **Grafo de dependencias:** `privacy` no depende de nadie; `schema` es la base de todos; ningún paquete importa de `apps/*`; ningún ciclo, ni de tipos. Declarado y usado coinciden salvo el `zod` del punto 5.
- **`packages/schema` como contrato común:** no hay tipos `Block` ni `AssistantAnswer` duplicados en ningún paquete.
- **Camino crítico del bundle:** `tesseract`, `pdfjs` y `traineddata` dan cero coincidencias en `apps/web/.next/static/chunks`, y `@letra-grande/extract` no es dependencia de la web. La guarda que se puso en QA-05 se cumple con evidencia en la build, no solo en el presupuesto.
- **La landing:** no carga el vault, ni el router de páginas, ni chunks propios. Lo que arrastra es el baseline de React y Next, inevitable en el app router.
- **Detección de datos personales:** no hay ninguna implementación fuera de `packages/privacy`.
- **Fechas y plazos:** el cálculo vive solo en `packages/radar` y no hay formateo de fechas en la web.

## Tareas de deuda propuestas

Registradas en `docs/backlog.md` como `REF-QA-08-01` a `REF-QA-08-05`. **Ninguna se ejecuta aquí.** Orden por coste de dejarlas:

| REF | Qué | Por qué primero |
|---|---|---|
| `REF-QA-08-01` | Tokens: un solo sitio y literales fuera | Es la que más se degrada sola: cada pantalla nueva copia más hexes |
| `REF-QA-08-02` | La medición no cuenta polyfills `noModule` | Afecta al presupuesto de QA-05 y hoy exagera entre un 21 % y un 23 % |
| `REF-QA-08-03` | El vault carga bajo demanda | Acoplamiento, no peso: 2.9 KiB gzip |
| `REF-QA-08-04` | Una sola normalización en `packages/ai` | Divergencia silenciosa entre tono y caducidad |
| `REF-QA-08-05` | Limpieza menor (dependencias, setup, nombres) | Sin coste hoy; se hace cuando se toque esa zona |

## Deuda que no es de arquitectura y sigue abierta

- **QA-04 está bloqueada** por AI-03 y AI-04: su criterio pide "casos añadidos a las evaluaciones" y el conjunto de evaluaciones no existe porque la pantalla del chat tampoco. Decisión tomada con la persona responsable: esperar.
- **El recorrido manual con lector de pantalla** de QA-02 sigue pendiente de una persona, registrado en `docs/backlog.md`.
- **H-08 y las condiciones de NaN** siguen abiertas y son las que bloquean la producción del asistente, no la arquitectura.
