# Review gate REF-QA-08-01: una sola fuente de verdad para los colores

---
tarea: REF-QA-08-01
base: 2eeb80b
revisado: 2eeb80b
revisor: jd-judge-a
veredicto: aprobado con cambios
---

## Resumen

Revisado el refactor de la paleta: diez tokens nuevos y el registro `etiquetas` en `packages/design`, custom properties en `base.css`, `globals.css` sin redeclarar, y 130 literales hexadecimales sustituidos en tres hojas y en `landing.ts`. Sin bloqueantes. El revisor confirmó el objetivo (cero literales fuera de `tokens.ts` y `base.css`, ninguna custom property declarada dos veces, ningún `var(--lg-*)` sin declarar), calculó 17 ratios de contraste y verificó que las sustituciones son el mismo valor exacto salvo las unificaciones aceptadas. Dos recomendados y una nota, aplicados en la única ronda.

## Hallazgos

### 1. [recomendado] packages/design/test/tokens.test.ts

Problema: el test de coherencia exigía que el conjunto de custom properties de `:root` coincidiera exactamente, sin faltar ni sobrar, y eso está bien. Pero **ningún test comparaba los valores** de los diez tokens nuevos entre `tokens.ts` y `base.css`: un desvío como `--lg-texto-tenue: #55556F` habría pasado la suite entera, y la fuente de verdad se quedaba sin vigilancia justo donde la tarea dice que vive.
Aplicado: un `describe` nuevo que itera los tokens `color*` y exige `--lg-<kebab>: <valor>` en `base.css`, más el mismo control para las dos propiedades de cada etiqueta. La conversión camelCase a kebab está en el propio test, así que un token nuevo queda cubierto sin tocar el test.
Riesgo del cambio: bajo. Esfuerzo: S.

### 2. [recomendado] packages/design/test/contrast.test.ts

Problema: el invariante "todo par texto/fondo nuevo pasa AA" no estaba fijado del todo. Quedaban sin test pares que se usan de verdad: `colorAcentoSuaveTexto` sobre lienzo y superficie, el texto de la etiqueta `ok` sobre acento suave y superficie, y los tres grises claros (`bordeSuave`, `borde` y el nuevo `textoApoyo`) usados como texto sobre tinta. El revisor los calculó todos y pasan AA con holgura (6.74 a 14.40:1), así que no había regresión: lo que faltaba era la red.
Aplicado: un `describe` nuevo con los tres grupos, para que el uso real quede medido y no solo el par "bonito" de cada token.
Riesgo del cambio: bajo. Esfuerzo: S.

### 3. [nota] packages/design/src/tokens.ts, `colorBordeFuerte`

Problema: el token se llamaba `colorBordeFuerte` y su comentario decía "texto de apoyo sobre fondos oscuros". Los dos usos reales (`landing.css:816` y `:1110`) son `color`, texto sobre tinta, nunca un borde: el nombre inducía a error.
Aplicado: renombrado a `colorTextoApoyo`, con su custom property `--lg-texto-apoyo` y los dos usos de la landing. El revisor proponía corregir el comentario y dejar el renombrado a una `REF`; se hace ahora porque el token se creó en este mismo cambio y todavía no tiene consumidores fuera de estas hojas. Renombrarlo después obligaría a tocar a quien lo use.
Riesgo del cambio: bajo. Esfuerzo: S.

## Comprobaciones propias del revisor

- `git status` y `git diff dev` sobre los once ficheros tocados.
- `grep` de hexadecimales en las tres hojas, `landing.ts` y `base.css`: cero literales fuera de `base.css`.
- Inventario de `var(--lg-*)` usados frente a declarados: solo `--lg-fuente-base` y `--lg-linea` fuera de `base.css`, declaradas en `globals.css` como escala tipográfica de la app.
- Comparación programática de los hex de `tokens.ts` frente a `base.css`: cero valores sin par, caja de mayúsculas uniforme.
- 17 ratios de contraste calculados: todos los pares nuevos por encima de 4.5:1. La unificación del aviso baja de 7.69:1 a 7.21:1 (sigue AA) y la del peligro sube de 7.18:1 a 7.92:1.
- `pnpm --filter @letra-grande/design test`: 43 en verde en el momento de la revisión.
- `vitest run src/test/pwa.test.ts`: 11 en verde.
- Nombres de custom properties: los diez tokens tienen uso; ninguna declaración duplicada.
- Sin rayas largas ni medias rayas, sin `any`.

### Lo que el revisor consideró bien resuelto

- El test de `pwa.test.ts` **refleja la decisión y no es un acomodo**: el segundo test exige contenido (`--lg-espacio: 0.25rem`, `--lg-radio: 0.5rem`, `--lg-fuente-base: 1rem`, `--lg-linea: 1.6`), así que no pasaría con un `globals.css` vacío, y el primero exige además que `base.css` declare los tokens.
- Sin divergencias de aspecto más allá de las tres unificaciones aceptadas y documentadas.
- `packages/design` no rompe nada de lo que ya exportaba: `client.ts` e `index.ts` intactos, `etiquetas` anidado dentro de `tokens` para no ampliar los barrels.

## Qué se aplicó en la ronda de correcciones

Los dos recomendados y la nota, más el renombrado que la nota dejaba a medias. Resultado: 48 tests en `packages/design` (eran 43) y el resto de la suite intacta.

## Sobre el proceso

Esta REF necesitó dos pasadas porque la superficie que autorizó el orquestador no incluía `apps/web/src/test/pwa.test.ts`, que anclaba justo el comportamiento que la tarea elimina. El worker paró y pidió autorización en lugar de reescribir el test por su cuenta para que pasara; ese aviso es lo que permitió corregir el rumbo. Lección para la próxima REF de este tipo: cuando una tarea elimina una duplicación, hay un test que la exige, y hay que incluirlo en la superficie desde el principio.
