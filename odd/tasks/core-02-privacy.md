# CORE-02: detección y enmascarado de datos personales

## Objetivo y motivo

Implementar `@letra-grande/privacy` según la sección 9: `detect`, `mask`, `unmask` e `isSafeToSend`. Es la pieza que sostiene la promesa central del proyecto (los datos personales no salen del dispositivo) y la que el proxy usará después como segunda barrera.

## Alcance y restricciones

- Dentro: `packages/privacy/src/**` (detección, validación de DNI/NIE, IBAN módulo 97, Luhn, prioridad y solapes, términos conocidos, placeholders, mapping) y `packages/privacy/test/**` con todos los vectores de la tabla de la sección 9.
- Fuera: proxy de IA (AI-01), vault, interfaz del contador de datos ocultos, embeddings y cualquier llamada de red.
- Invariantes del proyecto que aplican: sobreenmascarar es preferible a dejar pasar; un dato que falla la validación se enmascara igualmente; el mapping vive solo en memoria local; `detect` sobre texto ya enmascarado devuelve lista vacía; sin datos personales reales en tests (los vectores de la sección 9 son ficticios o de ejemplo público).

## Superficie de edición (nuestra)

`packages/privacy/**`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest`.
- Fuente de la decisión: `AGENTS.md`.
- RED: primero los vectores de la tabla de la sección 9 (incluidos los casos negativos: `4111 1111 1111 1112` no se enmascara y `el 12345678 a las 10` no es DNI), y `mask` seguido de `unmask` devuelve el original.

## Riesgo y review (nuestra)

- Tipo: privacidad.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 2 (privacidad y seguridad). Un falso negativo manda datos personales a un tercero. Review centrada en: cobertura de los vectores, casos límite de solapes, normalización estable del mismo valor al mismo marcador y ausencia de estado global que filtre datos entre documentos.

## Tareas

- [ ] T1: tests de los vectores de la sección 9 (RED).
- [ ] T2: `detect` con prioridad, validaciones y solapes.
- [ ] T3: `mask`, `unmask` e `isSafeToSend` con placeholders estables.
- [ ] T4: cobertura del paquete por encima del 90 % y `--passWithNoTests` eliminado.
- [ ] T5: `pnpm check` en verde.

## Evidencia y progreso

- RED: los 14 vectores de la sección 9 fallando (`mask is not a function`, detecciones vacías).
- GREEN: 14 de 14; después 28 de 28 con los casos límite.
- Cobertura del paquete: 99,58 % de sentencias, 95 % de ramas, 100 % de funciones, 99,58 % de líneas, con umbral de 90 % configurado en `vitest.config.ts`.
- `pnpm check` en la raíz en verde.
- Única dependencia nueva: `@vitest/coverage-v8`, justificada por el criterio de cobertura del 90 %.
- Prioridad implementada: términos conocidos, IBAN, CUPS, tarjeta, email, documento, teléfono; a igual prioridad, longitud descendente y luego posición; los solapes se descartan.
- Interpretación reportada, no silenciosa: Luhn actúa como puerta del patrón tarjeta (si falla, no hay detección), tal como pide el vector `4111 1111 1111 1112`; documento e IBAN inválidos sí se detectan con `valid: false` y se enmascaran igualmente.
- El mapping de un término conocido guarda el valor canónico del término, para que todas sus variantes de caso compartan el mismo marcador.

## Siguiente paso

Desbloquea AI-01.

## Cambios de alcance aceptados

Ninguno.
