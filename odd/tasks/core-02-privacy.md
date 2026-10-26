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

Pendiente de rellenar por quien implementa: comandos ejecutados, número de tests y cobertura.

## Siguiente paso

Desbloquea AI-01.

## Cambios de alcance aceptados

Ninguno.
