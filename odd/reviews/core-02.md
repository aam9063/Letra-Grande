# Review gate CORE-02: detección y enmascarado de datos personales

---
tarea: CORE-02
base: e810859
revisado: dc0d76c
revisor: jd-judge-a (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

Los doce vectores de la sección 9 están cubiertos y probados, incluidos los negativos: `4111 1111 1111 1112` no se enmascara, `el 12345678 a las 10` no se detecta, y `mask` seguido de `unmask` devuelve el original. `detect()` sobre texto ya enmascarado devuelve lista vacía y `mask` es idempotente. Sin estado de módulo: mapping, contador y marcadores son locales de cada llamada. Validaciones correctas y probadas por el lado del fallo: letra de DNI, letra de NIE, dígito de control de IBAN y Luhn. Sin `console`, sin red, sin valores en mensajes de error y sin serializar el mapping. El umbral de cobertura del 90 % es real: `test` ejecuta `vitest run --coverage` y el run falla si baja. Única dependencia nueva: `@vitest/coverage-v8`. Datos ficticios o de ejemplo público, sin rayas, comentarios en español.

## Hallazgos

### 1. [recomendado] packages/privacy/src/detect.ts:22, 26, 28

Problema: los patrones exigían mayúsculas, así que entradas reales como `12345678z` o `es91 2100 0418 4502 0005 1332` no se detectaban. Es un falso negativo en la promesa central del proyecto.
Propuesta: IBAN y CUPS con bandera `i`; DNI y NIE con letra en cualquier caso cuando está pegada a los dígitos y solo mayúscula cuando media un espacio. Aplicado, con nueve tests nuevos que incluyen el negativo `el 12345678 a las 10` y el falso positivo aceptado `el 12345678 A las 10` (sobreenmascarar es preferible). Esfuerzo: S.

### 2. [recomendado] packages/privacy/test/privacy.spec.ts

Problema: faltaba el desempate a igual prioridad por longitud.
Propuesta: test con `Ana` y `Ana García` solapados, donde gana el más largo. Aplicado. Esfuerzo: S.

### 3. [nota] packages/privacy/package.json:13

Problema: `@letra-grande/schema` declarada y sin uso en `src/`.
Propuesta: quitarla. Aplicado, con el lockfile actualizado. Esfuerzo: S.

### 4. [nota] packages/privacy/src/detect.ts:19

Problema: el escaper de términos conocidos no escapaba `}` de forma explícita.
Verificación posterior: la clase ya incluía ambas llaves, así que la premisa estaba cubierta de facto. Se deja explícito y con test. Esfuerzo: S.

### 5. [nota] packages/privacy/src/mask.ts:16

Problema: dos teléfonos distintos con los mismos nueve últimos dígitos comparten marcador.
Propuesta: aceptable para números españoles; documentado en el código. Esfuerzo: S.

## Qué se aplicó en la ronda de correcciones

Los cinco hallazgos: F-1 y F-2 con tests, F-3 con eliminación de la dependencia muerta, F-4 explicitando el escape y F-5 documentando la colisión de teléfono. Resultado: 37 tests en verde, cobertura 99,58 % de sentencias, 95 % de ramas, 100 % de funciones y 99,58 % de líneas, con `pnpm check` en verde.
