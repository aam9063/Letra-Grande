# Review gate DOCS-01a: extracción de texto de PDF en local

---
tarea: DOCS-01a
base: 89c567d
revisado: 4c1d7a0
revisor: jd-judge-b (contexto limpio, solo lectura, ejecución propia de los tests)
veredicto: aprobado con cambios
---

## Resumen

La garantía de privacidad se sostiene con evidencia recolectada, no con una afirmación: `getDocument` va sin `cMapUrl` ni `standardFontDataUrl`, con `useWorkerFetch: false` y datos en memoria, y el espía de `fetch` se queda en cero. El build de pdf.js v6 no contiene `eval` ni `new Function`, así que la desaparición de `isEvalSupported` no degrada la postura de seguridad. La API cumple lo documentado: el buffer de quien llama queda intacto byte a byte, `maxPages` rechaza valores inválidos incluidos `NaN` e `Infinity`, y `pageCount` sigue siendo el total aunque se recorte la lectura. Los fixtures son sintéticos y su generador no tiene dependencias; el "escaneado" tiene el flujo de contenido vacío, verificado abriéndolo. `pdfjs-dist` es la única dependencia de ejecución, Apache-2.0, y el README explica el worker autoalojado que necesitará la app.

## Hallazgos

### 1. [recomendado] packages/extract/test/extract.test.ts:15

Problema: el espía de `fetch` no fijaba implementación, así que si pdf.js empezara a pedir red, la petición real saldría antes de que el test fallara.
Propuesta: que el espía rechace. Aplicado: `mockRejectedValue(new Error("red prohibida"))` y sigue exigiendo cero llamadas.

### 2. [recomendado] packages/extract/test/extract.test.ts

Problema: la rama de PDF con contraseña no tenía test, y el README prometía que un documento cifrado no cuelga.
Propuesta: un fixture cifrado. Fabricar a mano un PDF cifrado válido es desproporcionado, así que se hace lo honesto: el README dice ahora lo que está verificado (corrupto y vacío fallan con mensaje claro) y el fixture cifrado con su test queda registrado como `REF-DOCS-01a`, con el motivo.

### 3. [recomendado] packages/extract/src/index.ts:60-64

Problema: `hasTextLayer` se calcula solo sobre las páginas que permite `maxPages`, así que un documento escaneado cuyo texto empieza más adelante declara `false` con el límite por defecto.
Propuesta: dejarlo escrito. Aplicado en el JSDoc y en el README, con la indicación de que el paso de OCR mire el total de páginas antes de decidir.

### 4. [refactor] packages/extract/src/index.ts:29-37

Problema: `mensajeDeError` descartaba el error original y se perdía el diagnóstico.
Propuesta: pasarlo como `cause`. Aplicado.

### 5. [nota] Concatenación de fragmentos

`item.str` se pega sin separador salvo donde pdf.js marca fin de línea, así que algunos documentos pierden límites de palabra. Es deliberado y ahora está en el README, para que los extractores no asuman espaciado perfecto.

### 6. [nota] Cobertura fijada

La no mutación del buffer y el tope de páginas se verificaron a mano en la review; ahora hay dos tests que los fijan, con una fixture de 60 páginas.

### 7. [nota] El espía no ve el otro reino

En el navegador, el `fetch` del worker real ocurre en otro reino y el test no puede verlo; el README ya obliga a autoalojar el worker. Consciente y aceptado.

## Code smells

Ninguno bloqueante. La pérdida de `cause` y la semántica de `hasTextLayer` en el borde del truncado quedaron corregidas y documentadas.

## Secretos

Ninguno. Sin datos personales en fixtures, tests ni documentación.

## Qué se aplicó en la ronda de correcciones

Los cuatro hallazgos accionables y las dos notas con acción. Resultado: 8 tests en el paquete y `pnpm check` en verde.
