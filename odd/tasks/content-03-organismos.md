# CONTENT-03: fichas de organismos de consumo

## Objetivo y motivo

El asistente solo puede afirmar lo que está en una ficha con fuente, y `content/authorities/` está vacío: no hay a quién derivar ni a quién escalar. Sin organismos, MOD-01 (reclamar) no tiene ruta de escalado, MOD-05 no puede decir dónde se presenta una multa y el asistente no puede citar nada. Esta tarea escribe las fichas de los organismos de consumo y sectoriales, como **borradores con fuente oficial**, listos para que una persona los verifique (H-07).

## Alcance y restricciones

- Dentro: fichas de `content/authorities/` para el consumo estatal, telecomunicaciones, banca, seguros, energía, aviación y el consumo autonómico de la Comunitat Valenciana, con su fuente oficial, URL y fecha de consulta.
- Fuera: verificar (eso es H-07 y no lo firma un agente), el resto de comunidades (DATA-05), fichas de empresas (CONTENT-02) y trámites (CONTENT-04).
- Invariantes:
  - **Nada inventado**: solo lo que dicen las páginas consultadas hoy; lo que no se ha podido comprobar no se escribe.
  - `verified: false` siempre, con nota de que es un borrador.
  - Cada ficha lleva al menos una fuente `oficial` con URL y `retrievedOn`.
  - Sin datos personales ni teléfonos inventados.

## Superficie de edición (nuestra)

`content/authorities/**`, `docs/backlog.md`, `odd/tasks/content-03-organismos.md`.

## Modo TDD (nuestra)

- No hay lógica nueva: la comprobación es el validador de contenido del proyecto (`pnpm content:validate`), que exige slugs, fuentes válidas, `region` en los organismos no estatales y coherencia de la verificación.

## Riesgo y review (nuestra)

- Tipo: contenido.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 1 (datos del producto: una URL o un procedimiento equivocado manda a la persona al sitio equivocado; por eso todo va con fuente y `verified: false`).

## Tareas

- [x] Documento de funcionalidad antes de escribir las fichas.
- [x] Consultar las fuentes oficiales de cada organismo y anotar URL y fecha.
- [x] Escribir las fichas con `howToFile` fiel a la fuente.
- [x] `pnpm content:validate` en verde: 10 fichas válidas (7 nuevas y las 3 plantillas).
- [x] Backlog actualizado; H-07 tiene siete fichas por verificar con sus fuentes.

## Evidencia y progreso

Rama `lg/content-03-organismos`.

- Fuentes consultadas el 2026-10-28 (todas oficiales): `dsca.gob.es` (Ministerio de Derechos Sociales, Consumo y Agenda 2030), `usuariosteleco.digital.gob.es` (Oficina de Atención al Usuario de Telecomunicaciones), `bde.es` y `clientebancario.bde.es` (Banco de España), `dgsfp.mineco.gob.es` (Dirección General de Seguros y Fondos de Pensiones), `cnmc.es` y `miteco.gob.es` (energía), `seguridadaerea.gob.es` (AESA), `cindi.gva.es` y `dsca.gob.es` (consumo autonómico de la Comunitat Valenciana).

- Siete fichas en `content/authorities/`: `consumo-estatal`, `oficina-atencion-usuario-telecomunicaciones`, `banco-de-espana`, `dgsfp`, `cnmc-energia`, `aesa` y `consumo-comunitat-valenciana`. Todas con `verified: false`, su nota de borrador y entre una y dos fuentes oficiales con fecha de consulta.
- Las doce URL de las fichas (sin contar la de la plantilla) se comprobaron con `curl`: las doce responden 200.
- Review gate (`odd/reviews/content-03.md`, aprobado con cambios) y una ronda aplicada: fuera una frase sobre la distribuidora que no estaba en la fuente, GASPAR reatribuido a contratación y vigencia, la página de contacto de la Oficina añadida como fuente, la CNMC descrita como supervisora y no como cauce de reclamación (con sus plazos de quince y cinco días hábiles), remisión explícita a las fichas sectoriales y alcance autonómico anotado en el backlog.
- Lo que las fichas **no** afirman, a propósito, para no inventar: el plazo de resolución de la Oficina de Telecomunicaciones, el plazo y la documentación de la reclamación ante AESA, y el órgano autonómico concreto al que se eleva una reclamación de energía. Quedan como puntos concretos de H-07.

## Siguiente paso

Verificación humana (H-07) de estas siete fichas y, después, CONTENT-02 con las empresas.

## Cambios de alcance aceptados

1. El consumo autonómico se limita a la Comunitat Valenciana (D-08: es la comunidad que se puede verificar primero). El resto de comunidades entra en DATA-05 por decisión de alcance, no por falta de fuentes.
