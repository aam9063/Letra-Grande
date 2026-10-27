# Activos del OCR

Ficheros que el OCR necesita para funcionar sin conexión y sin pedirle nada a un tercero. Se versionan aquí por la decisión D-13: el modelo de español viaja en el repositorio a cambio de que la primera foto funcione aunque no haya red. Nada de esta carpeta se edita a mano.

Todo es **Apache-2.0**, compatible con la licencia MIT del proyecto. Las tres licencias completas están junto a los binarios.

`manifest.json` es la fuente de verdad legible por máquina: nombre, bytes, sha256, origen y licencia de cada fichero. Un test recalcula el sha256 de todo lo que hay en esta carpeta contra el manifiesto, así que un binario corrupto o sustituido a medias falla en la suite y no en el navegador. La tabla de abajo es la versión para leer, no la que se comprueba.

| Fichero | Bytes | Origen | sha256 |
|---|---|---|---|
| `worker.min.js` | 111 307 | `tesseract.js` 7.0.0, `dist/worker.min.js` | `576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d` |
| `tesseract-core-relaxedsimd-lstm.wasm.js` | 3 905 767 | `tesseract.js-core` 7.0.0 | `861a536cf9ef8e63cb644d57bab39c388f37f7d6b6f60024b741c5f6b39a59b3` |
| `tesseract-core-simd-lstm.wasm.js` | 3 899 472 | `tesseract.js-core` 7.0.0 | `c58b46a4c796c0b8afccf77591d5b875b6896b45d402bbce8caa6f5362447b38` |
| `tesseract-core-lstm.wasm.js` | 3 896 484 | `tesseract.js-core` 7.0.0 | `eef5f8b2f8e20e150680b20adaec4a60babafee3adbe8a94583c81fee46e8680` |
| `spa.traineddata` | 13 570 187 | `tessdata_best`, `spa.traineddata` del commit `9ddc24e750eec0994223a9edc3fcb434a2244f3b` | `e2c1ffdad8b30f26c45d4017a9183d3a7f9aa69e59918be4f88b126fac99ab2c` |
| `LICENSE-tesseract.js.txt` | 11 357 | `tesseract.js` 7.0.0, `LICENSE.md` | `b40930bbcf80744c86c46a12bc9da056641d722716c378f5659b9e555ef833e1` |
| `LICENSE-tesseract.js-core.txt` | 11 358 | `tesseract.js-core` 7.0.0, `LICENSE` | `c6596eb7be8581c18be736c846fb9173b69eccf6ef94c5135893ec56bd92ba08` |
| `LICENSE-tessdata.txt` | 10 173 | `tessdata_best`, `LICENSE` del commit `e744fa9056c07feeba2e9d10d64f834c176d546b` | `a6cba85bc92e0cff7a450b1d873c0eaa2e9fc96bf472df0247a26bec77bf3ff9` |

Total de los binarios: 25 363 217 bytes, unos 24 MB.

Los tres núcleos son las variantes LSTM (relaxed SIMD, SIMD y sin SIMD). El worker elige una según lo que soporte el dispositivo, y por eso están las tres: si faltara la que toca, ese navegador acabaría pidiendo el núcleo a un CDN, que es justo lo que este paquete no hace.

`spa.traineddata` es el modelo `best` de español, no el `fast`: pesa más y lee mejor una foto hecha con el móvil, que es el caso de uso. El `fast` rondaría 2 MB y queda como alternativa si algún día el peso estorba.

## Cómo se regeneran

```bash
pnpm --filter @letra-grande/extract ocr:assets
```

El script `scripts/fetch-ocr-assets.mjs` copia el worker, los núcleos y sus licencias desde las dependencias instaladas, descarga el modelo y su licencia de `tessdata_best` en el commit fijado y comprueba tamaño y sha256 de los ocho ficheros contra `manifest.json`. Si algo no cuadra, falla en vez de dejar un binario a medias.

Subir de versión de `tesseract.js` obliga a volver a ejecutarlo: los tres núcleos tienen que ser de la misma versión que el worker.

## Cómo se sirven

`packages/extract` no sirve ficheros: los resuelve con `resolveOcrAssets()`, que devuelve las rutas del worker, del núcleo y del modelo a partir de una base propia (`/ocr` por defecto) y rechaza cualquier base con origen. La app tiene que exponer esta carpeta en esa ruta: en `apps/web` eso es copiarla a `apps/web/public/ocr`, que Next sirve tal cual en los dos modos de build. La copia es trabajo de la tarea que integre el OCR en la interfaz (CARPETA-01), igual que el worker de pdf.js de DOCS-01a.

Nada de CDN, y ninguna de las tres rutas se deja con el valor por defecto de `tesseract.js`, que apunta a jsDelivr.
