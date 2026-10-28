---
tarea: CONTENT-03
base: dc715a5
revisado: 91a17eb
revisor: jd-judge-b
veredicto: aprobado con cambios
---

## Resumen

Siete fichas de organismos como borradores con `verified: false`, una o dos fuentes oficiales cada una y `howToFile` breve. He comprobado con `curl` las 12 URL del diff: las 12 responden 200 hoy (2026-10-28 coincide con el commit, no he podido reproducir la fecha de consulta exacta de la fuente). He verificado el texto de las afirmaciones contra las páginas citadas y la mayoría se sostienen literalmente: los plazos del Banco de España (15 días hábiles en servicios de pago, un mes consumidor, dos meses no consumidor) están en `clientebancario.bde.es`; la presentación telefónica obligatoria del operador, el papel y los registros de la Oficina de Telecomunicaciones; la Orden ECC/2502/2012 y GASPAR de la DGSFP; la ruta de `dsca.gob.es`; y la ruta de `cindi.gva.es` (atención al cliente primero, hojas de reclamaciones, servicios territoriales, OMIC, asociaciones, telemática con certificado). `pnpm content:validate` en verde (10 fichas). Quedan tres afirmaciones que las fuentes citadas no dicen: una frase de la ficha de la CNMC, la atribución del "paso a paso" a GASPAR y la frase de las dependencias de la Secretaría de Estado, que está en una página del mismo sitio que no está citada como fuente. El documento de tarea declara con honestidad lo que no se ha verificado (plazos de la Oficina, documentación de AESA, órgano autonómico de energía) y lo encaja en H-07.

## Hallazgos

### 1. [recomendado] content/authorities/cnmc-energia.yaml:9-10
Problema: la frase "Las reclamaciones ante la distribuidora se pueden presentar también a través de la comercializadora" no aparece en ninguna de las dos fuentes citadas. La página de la CNMC solo dice que la reclamación va a la comercializadora (tarifa, altas y bajas, factura, datos) o a la distribuidora (cortes, averías, contador, lecturas, fraude, nuevos suministros); el único "a través del comercializador" de la página se refiere a cambiar la potencia, no a presentar reclamaciones. La página de MITECO tampoco lo dice. Puede ser cierto (viene de la regulación de la CNMC), pero viola el invariante de la propia tarea: "solo lo que dicen las páginas consultadas hoy".
Propuesta: quitar la frase, o localizar la página oficial que lo dice y añadirla como fuente antes de H-07.
Riesgo del cambio: bajo. Si el asistente cita esto, manda a la persona a un cauce que la fuente citada no respalda. Esfuerzo: S.

### 2. [recomendado] content/authorities/dgsfp.yaml:10-12
Problema: la ficha dice que GASPAR trae "el proceso de reclamación explicado paso a paso". La página citada de GASPAR lo describe como guía para la contratación y la vigencia del producto contratado; no menciona el proceso de reclamación paso a paso. El "paso a paso" de reclamaciones corresponde a otro documento de la misma web: la "Guía práctica de presentación de consultas, quejas y reclamaciones" que enlaza la página de InformaciónProcedimiento.
Propuesta: atribuir el "paso a paso" a la guía práctica del procedimiento, no a GASPAR, o citar la página concreta de GASPAR que lo diga.
Riesgo del cambio: bajo. Si H-07 verifica contra GASPAR, no encontrará lo que la ficha afirma. Esfuerzo: S.

### 3. [recomendado] content/authorities/oficina-atencion-usuario-telecomunicaciones.yaml:10-11
Problema: la frase "La Oficina no da información sobre reclamaciones en las dependencias de la Secretaría de Estado" es cierta: la he comprobado hoy en `https://usuariosteleco.digital.gob.es/contacto`. Pero esa página no está en `sources`, y la frase tampoco aparece en las dos páginas citadas. Una afirmación sin fuente en la ficha, aunque sea cierta.
Propuesta: añadir la fuente `usuariosteleco-contacto` con esa URL y fecha, o quitar la frase (aporta poco al `howToFile`: no es un paso de reclamación).
Riesgo del cambio: bajo. Esfuerzo: S.

### 4. [nota] content/authorities/cnmc-energia.yaml:5-11
Problema: la fuente citada dice literalmente "La CNMC no tiene competencia para resolver reclamaciones". La ficha no lo recoge y, al ser una ficha de "organismo", el asistente podría presentar la CNMC como lugar donde reclamar.
Propuesta: añadir una frase al `howToFile` con esa advertencia, que está en la fuente citada.
Riesgo del cambio: bajo. Evita derivar a un organismo que no resuelve. Esfuerzo: S.

### 5. [nota] content/authorities/consumo-estatal.yaml:4
Problema: la ficha general declara los ocho sectores y la página del ministerio deriva cada sector a su regulador específico (banca al Banco de España, seguros a la DGSFP, telecomunicaciones a la Oficina, aéreo a AESA, suministros a OMIC o consumo autonómico). Con las fichas sectoriales ya en el catálogo, el asistente podría citar la general en un caso de banca o seguros.
Propuesta: una frase en `howToFile` del tipo "para banca, seguros, telecomunicaciones o aviación, la ficha del organismo sectorial tiene el cauce concreto". Está implícito en la fuente.
Riesgo del cambio: bajo. Esfuerzo: S.

### 6. [nota] docs/backlog.md:87
Problema: la fila de CONTENT-03 sigue diciendo "consumo autonómico por comunidad", pero el alcance aceptado (cambio 1 del documento de tarea, decisión D-08) reduce a la Comunitat Valenciana y mueve el resto a DATA-05. La fila no lo anota.
Propuesta: añadir a la fila "(primera: Comunitat Valenciana, D-08; resto en DATA-05)".
Riesgo del cambio: bajo. Evita que alguien lea la fila como incumplida. Esfuerzo: S.

## Qué se verificó sin hallazgos

- URL: las 12 de las fuentes responden 200 (securidadaerea.gob.es, bde.es, clientebancario.bde.es, cnmc.es, miteco.gob.es, cindi.gva.es, dsca.gob.es x2, dgsfp.mineco.gob.es x2, usuariosteleco.digital.gob.es x2).
- Nombres oficiales: Agencia Estatal de Seguridad Aérea, Banco de España, Comisión Nacional de los Mercados y la Competencia, Dirección General de Seguros y Fondos de Pensiones, Oficina de Atención al Usuario de Telecomunicaciones, Ministerio de Derechos Sociales, Consumo y Agenda 2030, y Dirección General de Comercio, Artesanía y Consumo (consta así en el directorio del ministerio).
- `scope`/`region`/`sectors` coherentes con el esquema: solo la ficha autonómica lleva `region`, y sus sectores cubren el consumo general valenciano.
- Sin datos personales, sin teléfonos (la ficha de la DGSFP no copia el teléfono que sí aparece en su fuente: correcto, evita cifras sin revalidar), sin cifras sueltas sin fuente.
- Texto en español, tuteo, sin rayas largas ni medias rayas; `verified: false` en las siete con nota de borrador y referencia a H-07.
- `pnpm content:validate` en verde: 10 fichas (7 nuevas y 3 plantillas), como dice el documento de tarea.
- El documento de tarea declara explícitamente lo que las fichas no afirman para no inventar, y lo encaja en H-07.

## Qué se aplicó en la ronda de correcciones

- Hallazgo 1 (recomendado), aplicado: la frase sobre presentar reclamaciones a la distribuidora a través de la comercializadora no estaba en las fuentes citadas y se ha quitado. Al reescribir la ficha con el texto literal de la página de la CNMC aparecieron dos datos que sí están y que valía la pena tener: la empresa debe emitir acuse de recibo y contestar en quince días hábiles (cinco para casos concretos de usuarios con menos de 15 kW), y el paso siguiente es el sistema de resolución alternativa de litigios o el órgano autonómico. Se añadió la guía de la CNMC como tercera fuente.
- Hallazgo 2 (recomendado), aplicado: GASPAR ya no se presenta como el paso a paso de la reclamación. La ficha dice que explica la contratación y la vigencia del producto, y el procedimiento queda en la página del procedimiento.
- Hallazgo 3 (recomendado), aplicado: la frase de las dependencias de la Secretaría de Estado se queda, y la página de contacto de la Oficina pasa a ser fuente citada.
- Hallazgo 4 (nota), aplicado y de hecho reforzado: la ficha de energía dice ahora, con las palabras de la fuente, que la CNMC no resuelve reclamaciones y que su función es supervisar. Ese era el riesgo real: derivar a la CNMC como si fuera un cauce de reclamación.
- Hallazgo 5 (nota), aplicado: la ficha de consumo estatal remite a las fichas sectoriales de banca, seguros, telecomunicaciones y aviación.
- Hallazgo 6 (nota), aplicado: la fila del backlog anota el alcance acordado, solo la Comunitat Valenciana en lo autonómico (D-08), y que el resto entra en DATA-05.

Resultado: 10 fichas válidas, las 14 URL comprobadas, `pnpm check` y `pnpm e2e` en verde.
Rellena el implementador.
