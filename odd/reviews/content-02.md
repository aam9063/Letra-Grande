---
tarea: CONTENT-02
base: 1e7a42b
revisado: d48f0a0
revisor: jd-judge-b
veredicto: aprobado con cambios
---

## Resumen

Diez fichas de empresas como borradores con `verified: false`, una fuente de la propia compañía cada una y `escalation` a organismos de CONTENT-03. He comprobado con `curl` las 11 URL (las 10 del diff más la portada de Iberdrola): nueve responden 200 y son el dominio de la propia compañía, e Iberdrola responde 403 en todo el dominio, exactamente como declara el documento de tarea. Ninguna URL apunta a un tercero, a un comparador o a una página de otra compañía. Los `sourceId` de todos los canales existen y el `escalation` de las diez fichas apunta a organismos que existen: `pnpm content:validate` en verde (20 fichas), y el validador comprueba también los ids de `escalation` contra `content/authorities/`. No hay teléfonos, horarios ni permanencias en ninguna ficha; el `sector` y `kind: empresa` son coherentes; no hay rayas largas ni medias rayas en notas ni en el documento de tarea. La ausencia de teléfonos está declarada dos veces (alcance y evidencia) y el bloqueo 403 de Iberdrola está declarado tanto en el documento de tarea como en la nota de la ficha: no parece un olvido.

## Hallazgos

### 1. [recomendado] content/companies/naturgy.yaml:9, content/companies/endesa.yaml:9, content/companies/iberdrola.yaml:9, content/companies/repsol.yaml:9, content/companies/totalenergies.yaml:9, content/companies/digi.yaml:9
Problema: las cinco fichas de energía y la de Digi rellenan `reclamacion` con la misma URL que `atencionCliente`, cuya fuente citada es una página de contacto o de atención al cliente. El título de la fuente no muestra una vía de reclamación concreta (contraste con Movistar, Orange, Vodafone y Yoigo, que sí citan páginas específicas de reclamaciones). El canal `reclamacion` afirma algo que la fuente citada no acredita: que en esa página se puede reclamar formalmente.
Propuesta: dejar `reclamacion` vacío en esas seis fichas (el esquema lo permite y es lo que hacen las otras cuatro), o añadir en la nota de cada ficha que H-07 debe confirmar en esa página la vía de reclamación concreta antes de darla por buena.
Riesgo del cambio: bajo. Con `verified: false` y H-07 pendiente el impacto actual es nulo, pero si H-07 verifica la ficha mirando solo la URL, puede dar por verificado un canal de reclamación que la fuente no muestra. Esfuerzo: S.

### 2. [nota] content/companies/endesa.yaml:19
Problema: el `title` de la fuente dice "Te ayudamos | Endesa", pero el título real de la página es "Atención al cliente Endesa | Endesa". El resto de fichas coincide con el título real (comprobado hoy). Como la cita es lo que H-07 usará para reconocer la página, conviene que sea literal.
Propuesta: ajustar el título al de la página. Riesgo: nulo. Esfuerzo: S.

### 3. [nota] content/companies/*.yaml (escalation, todas las fichas)
Problema: el escalado de consumo apunta siempre a `consumo-estatal` y a `consumo-comunitat-valenciana`, un organismo autonómico con ámbito limitado a una comunidad. La fuente citada en `cnmc-energia` dice que, sin acuerdo, se acude "al órgano competente de su comunidad autónoma": para una persona fuera de la Comunitat Valenciana el organismo listado no es el suyo. Es coherente con lo que hay escrito en CONTENT-03 y es un borrador, así que no es bloqueante, pero conviene que quede explícito como punto de H-07 o de la siguiente tarea de contenido.
Propuesta: una línea en "Siguiente paso" del documento de tarea señalando que el escalado autonómico cubre solo una comunidad y que el resto llega después. No propongo fichas nuevas. Riesgo: nulo. Esfuerzo: S.

### 4. [nota] odd/tasks/content-02-empresas.md:38
Problema: la casilla "[ ] Backlog actualizado y lista de pendientes para H-07" queda sin marcar, pero el backlog ya está actualizado en este mismo commit. Además, el criterio de aceptación de la sección 17 pide una "lista de pendientes de verificar", que aquí está repartida entre las notas de las fichas y "Siguiente paso", sin lista única.
Propuesta: marcar la casilla o dejar la lista de las diez fichas pendientes de forma explícita. Riesgo: nulo. Esfuerzo: S.

### 5. [nota] odd/tasks/content-02-empresas.md:5 y 54
Problema: el criterio "las cinco mayores" no viene respaldado por ninguna fuente citada (no hay ranking de cuota de mercado). No rompe el invariante de datos porque ninguna ficha afirma ser "de las cinco mayores" y la decisión de alcance (TotalEnergies dentro, Holaluz fuera) está documentada en "Cambios de alcance aceptados".
Propuesta: ninguna obligatoria; si se quiere trazabilidad completa, citar la fuente del ranking en el documento de tarea. Riesgo: nulo. Esfuerzo: S.

## Comprobaciones sin hallazgo

- URL y dominios: 9 de 10 responden 200 hoy; `digimobil.es`, `endesa.com`, `movistar.es`, `naturgy.es`, `ayuda.orange.es`, `repsol.es`, `totalenergies.es`, `ayudacliente.vodafone.es` y `yoigo.com` son dominios propios de cada marca. Iberdrola: 403 en la ficha y en la portada, declarado en la ficha y en el documento de tarea.
- `escalation`: los tres organismos usados existen en `content/authorities/` y el validador lo comprueba. Para telefonía, la Oficina de Atención al Usuario es el escalado sectorial y su propia ficha exige reclamar primero al operador, coherente con lo que dicen las fichas.
- Coherencia: `sector: energia` en las cinco de luz y `telefonia` en las cinco de operadoras; `kind: empresa` en todas las fuentes; `verified: false` en las diez, sin `verifiedOn` ni `verifiedBy` (correcto: no corresponde a un agente).
- Sin datos inventados: no hay teléfonos, horarios, correos ni permanencias en ninguna ficha; la ausencia de teléfonos está justificada en el documento de tarea ("un número que caduca es peor que un hueco").
- Legibilidad: español, tuteo, frases cortas, sin rayas largas ni medias rayas.
- Honestidad del documento de tarea: declara lo no verificado (los 403, los teléfonos, las permanencias no consultadas) y lo encaja en H-07.
