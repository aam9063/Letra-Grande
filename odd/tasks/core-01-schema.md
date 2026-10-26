# CORE-01: contrato de datos en packages/schema

## Objetivo y motivo

Implementar `@letra-grande/schema` completo: ficha de empresa, organismo, trámite, bloques de respuesta del asistente y datos del vault, con el validador de contenido y los tests de la sección 8.8. Es el contrato que consumen UI, IA, privacy, vault y el contenido; sin él ninguna otra tarea puede tipar nada.

## Alcance y restricciones

- Dentro: `src/common.ts`, `src/company.ts`, `src/authority.ts`, `src/procedure.ts`, `src/blocks.ts`, `src/vault.ts`, `src/index.ts` (secciones 8.1 a 8.6); `scripts/validate-content.ts` completo (sección 8.7); las tres plantillas de `content/` (sección 10); los tests de la sección 8.8.
- Fuera: enmascarado (CORE-02), consumo de los tipos en interfaz e IA, contenido real verificado, cambio de esquema (H-04 y PR aparte).
- Invariantes del proyecto que aplican: una ficha solo es `verified: true` con quién, cuándo y al menos una fuente oficial o de la empresa; toda cita apunta a una fuente conocida; toda cifra de una afirmación aparece en el texto de la fuente citada; datos ficticios en todos los fixtures; sin rayas largas ni medias rayas.

## Superficie de edición (nuestra)

`packages/schema/**`, `content/companies/_template.yaml`, `content/authorities/_template.yaml`, `content/procedures/_template.yaml`.

## Modo TDD (nuestra)

- Activo: sí.
- Runner: `vitest`.
- Fuente de la decisión: `AGENTS.md`.
- RED: escribir primero los tests de la sección 8.8 y verlos fallar por ausencia de implementación, incluido el test pendiente del documento (el número de orden de un paso no debe contar como cifra de la afirmación).

## Riesgo y review (nuestra)

- Tipo: contrato de datos.
- Review gate: obligatorio (sección 22).
- Riesgo: potencial elemento 3 (contrato que consumen todos los carriles). Solo añade, no rompe consumidores existentes porque todavía no hay ninguno. Review centrada en: mensajes de error útiles, ausencia de `any`, validaciones que no se puedan esquivar y tests que prueben comportamiento y no implementación.

## Tareas

- [ ] T1: tests de la sección 8.8 en `packages/schema/test/` (RED).
- [ ] T2: implementar los seis módulos de esquema y el índice (8.1 a 8.6).
- [ ] T3: sustituir el validador provisional por el de la sección 8.7 y añadir las tres plantillas de la sección 10.
- [ ] T4: quitar `--passWithNoTests` del script `test` del paquete y dejar `pnpm check` en verde.
- [ ] T5: comprobar que `pnpm content:validate` recorre las tres plantillas.

## Evidencia y progreso

- RED: 21 tests fallando con `TypeError: Cannot read properties of undefined (reading 'safeParse')`, porque los módulos de `src/` todavía no existían.
- GREEN: 21 de 21 en verde tras implementar los seis módulos.
- `pnpm check` en la raíz: estilo, tipos y tests en verde.
- `pnpm content:validate`: `Contenido OK: 3 ficha(s) válidas.`, las tres plantillas pasan por el validador real de la sección 8.7.
- Test pendiente del documento cubierto: el número de orden de un paso no se cuenta como cifra de la afirmación.
- Ajustes respecto al documento: `StepBlock` se importa como valor y se tipa con `z.infer<typeof StepBlock>` (en zod 4 es un valor, no un tipo), y el test del número de paso usa los pasos 1 y 2 porque un paso suelto con `n: 3` violaría la numeración correlativa.

## Siguiente paso

Desbloquea AI-06, VAULT-01, CONTENT-01 y AI-02.

## Cambios de alcance aceptados

Ninguno.
