# Review gate REF-QA-08-02: el presupuesto no cuenta polyfills que nadie descarga

---
tarea: REF-QA-08-02
base: 864439a
revisado: 864439a
revisor: jd-judge-a
veredicto: aprobado con cambios
---

## Resumen

Revisada la separación entre primera carga moderna y bloque legacy en el medidor del presupuesto. El revisor confirmó las cifras contra la build real, comprobó que todas las formas del atributo `noModule` se detectan y que los tests anteriores siguen cubriendo lo que cubrían. Encontró **un bloqueante** que toca exactamente el riesgo declarado de la tarea: el total presupuestado quedó mil bytes por encima de la suma de máximos por ruta, así que la protección contra el crecimiento repartido se perdió mientras la documentación afirmaba lo contrario. Corregido, con un test que fija la relación.

## Hallazgos

### 1. [bloqueante] apps/web/perf/budget.json y la documentación

Problema: `totalGzip` estaba en 1 760 000 y la suma de los máximos por ruta es 1 759 000: mil bytes **por encima**, no por debajo. El comentario del presupuesto y el documento decían que quedaba por debajo para que un crecimiento repartido también fallara, y era falso. El margen del total pasó de 29.6 KiB (1.5 % sobre lo medido) a 191.7 KiB (12.5 %): una regresión de 3 KiB por ruta en las once rutas, que es como crecen de verdad las dependencias, fallaba antes por `total-excedido` y ahora pasaba en verde. Es la vía de colado que la propia tarea declara como su riesgo número 6.
Aplicado: `totalGzip` a 1 590 000, apenas un 1.5 % por encima de los 1 568 000 medidos y por debajo de la suma de máximos de 1 759 000. Y un test nuevo que exige `totalGzip < suma(porRuta)`, porque la guarda tiene que ser de la relación y no de unas cifras que se recalibran.
Riesgo del cambio: bajo. Esfuerzo: S.

### 2. [recomendado] scripts/check-bundle-budget.mjs

Problema: la detección era `/nomodule/i.test(etiqueta)` sobre el tag entero, incluido el valor de `src`. El revisor lo reprodujo: un chunk llamado `page-nomodule-abc123.js` **sin el atributo** se clasificaba como legacy y salía de la primera carga; con el bloque legacy en 38.7 KiB y tope en 43.9, un chunk moderno pequeño de nombre desafortunado se colaba entero. Justo lo contrario del argumento del documento, que dice que no se mira el nombre porque lo pone el bundler.
Aplicado: el atributo se busca fuera del valor de `src`, y hay un test con el nombre trampa.
Riesgo del cambio: bajo. Esfuerzo: S.

### 3. [recomendado] Documentación

Problema: decir que los límites dejaban "el mismo margen del 12 %" daba a entender neutralidad. El margen por ruta pasó de 21.7 a 25.9 KiB a 16.6 a 17.7 KiB: es más estrecho, lo cual es bueno, pero había que decirlo en cifras absolutas.
Aplicado: la documentación da los KiB absolutos y explica que una regresión de 20 KiB en una ruta que antes pasaba ahora falla.

### 4. [nota] El camino crítico ya no escanea el bloque legacy

Problema: `comprobarCaminoCritico` recorre solo los ficheros modernos, así que los marcadores prohibidos (`tesseract`, `pdfjs`) ya no se buscan en el bloque legacy. Es irrealista que acaben ahí, pero es una reducción de alcance que el documento no mencionaba.
Aplicado: queda escrito en `docs/rendimiento.md`.

### 5. [nota] El tope legacy es opt-in

Si alguien borra `maxLegacyGzipPorRuta`, el tope desaparece sin aviso. Se deja así a propósito: hacerlo obligatorio rompería los presupuestos sintéticos de los tests, que no declaran esa clave. Queda anotado como nota sin acción.

### 6. [nota] Ruido de formato en budget.json

El `$comment` se reescribió y el JSON reformateó bloques sin cambio semántico. Cosmético.

## Comprobaciones propias del revisor

- `node --test scripts/check-bundle-budget.test.mjs`: 16 en verde en el momento de la revisión (13 previos y 3 nuevos; después son 18).
- `node scripts/check-bundle-budget.mjs apps/web/.next`: 11 rutas, 1 527.1 KiB, camino crítico limpio.
- Medición ruta a ruta contra la tabla del documento: coincidencia exacta. Márgenes recalculados, antes y después.
- Aritmética del presupuesto: suma de `porRuta` 1 759 000 frente a `totalGzip` 1 760 000 (el bloqueante).
- Reproducción de la clasificación de `noModule` en cinco formas y del falso legacy por nombre de fichero.
- Comprobado que `htmlsPrerenderizados` está entero, tras el borrado accidental que ocurrió durante la implementación.
- Sin rayas largas, medias rayas ni `any` en los cinco ficheros del diff.

## Qué se aplicó en la ronda de correcciones

El bloqueante y los dos recomendados, y las notas 4 y 6. Resultado: 18 tests en el medidor, el presupuesto real en verde y la relación total/máximos fijada por test.
