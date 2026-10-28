---
tarea: CONTENT-04
base: 2b34a56
revisado: 0d1ea0a
revisor: jd-judge-b
veredicto: aprobado con cambios
---

## Resumen

Cuatro fichas de trámite como borradores con `verified: false`, cada paso y plazo con `sourceId`, y `pnpm content:validate` en verde (24 fichas). He comprobado hoy con `curl` las tres fuentes citadas (las tres responden 200 y `retrievedOn` 2026-10-28 coincide con la fecha de hoy). Lo que la fuente dice se sostiene literalmente: los 15 y 5 días hábiles del suministro eléctrico con su reparto comercializadora/distribuidora y el filtro de 15 kW, el acuse de recibo automatizado con fecha, hora y número de solicitud, el "La CNMC no tiene competencia para resolver reclamaciones", la resolución alternativa de litigios gratuita y solo para quien no es empresa, el plazo de un mes del operador de telecomunicaciones y la ventana de tres meses para acudir a la Oficina (esta última ni se afirma, bien). Quedan cuatro afirmaciones que las fuentes citadas no dicen: el proceso de portabilidad (contratar con la nueva, consentimiento, quién tramita), los canales de la baja y la aceptación telefónica obligatoria atribuidos a la baja en lugar de a las reclamaciones, y la gratuidad de la reclamación ante la empresa eléctrica. La documentación de la ficha de vuelo es cierta pero está en una subpágina de AESA que no se cita. El documento de tarea declara con honestidad lo que no se ha verificado y lo encaja en H-07.

## Hallazgos

### 1. [bloqueante] content/procedures/portabilidad-telefonia.yaml:12-13
Problema: el paso 1 afirma "Contrata con la operadora nueva y da tu consentimiento para la portabilidad: es ella la que hace los trámites con la compañía de la que te vas". La fuente citada (`usuariosteleco-reclamaciones`) no describe el proceso de portabilidad: no menciona ni "cambio de operador", ni "contrata", ni "consentimiento" (el único "consentimiento" de la página es un titular de noticia de 2009 sobre consentimiento verbal en portabilidad, no contenido normativo). La página es de reclamaciones, y lo único respaldado de esta ficha es la ruta de reclamación (pasos 2 y 3).
Propuesta: o se cita una fuente que diga ese proceso (por ejemplo la página de consumidores de la CNMC sobre telecomunicaciones, si lo dice) o se reescribe el paso 1 para afirmar solo lo que la fuente dice: que la reclamación va primero al operador y después a la Oficina.
Riesgo del cambio: bajo. Si H-07 verifica contra la página citada, no encontrará el proceso que la ficha afirma. Esfuerzo: S.

### 2. [bloqueante] content/procedures/baja-linea-telefono.yaml:12-13
Problema: el paso 1 atribuye a la petición de baja lo que la fuente dice de las reclamaciones. El texto literal de la fuente es "Los usuarios podrán presentar sus reclamaciones ante el operador por vía telefónica, a través de internet, por correo postal, o directamente en sus oficinas comerciales. En todo caso, el operador debe aceptar la presentación telefónica de reclamaciones." La ficha lo traslada a "Pide la baja a tu operador por cualquiera de sus canales... El operador debe aceptar la presentación telefónica" (sin la palabra "reclamaciones"). La fuente solo menciona la baja al hablar del número de referencia que permite "verificar el día de la solicitud de baja".
Propuesta: reformular el paso 1 para no atribuir canales ni aceptación telefónica a la baja (por ejemplo, que la fuente respalda los canales para reclamar y el paso 1 se limita a pedir la baja "por el canal que el operador ofrezca"), o localizar y citar la página oficial que fije los canales de la baja.
Riesgo del cambio: bajo. Es la misma afirmación real matizada; el asistente deja de citar un derecho que la fuente citada no otorga. Esfuerzo: S.

### 3. [bloqueante] content/procedures/reclamar-suministro-electrico.yaml:35
Problema: el campo `cost` afirma "La reclamación ante la empresa y el sistema de resolución alternativa de litigios son gratuitos". La fuente solo dice que la resolución alternativa de litigios es "más rápida, sencilla y gratuita" y que el teléfono de atención al cliente es "gratuito". No dice en ningún punto que la reclamación ante la comercializadora o distribuidora sea gratuita. La mitad de la afirmación es un coste sin fuente.
Propuesta: limitar el `cost` a lo que dice la fuente: "El sistema de resolución alternativa de litigios es gratuito y más rápido que la vía judicial". Si H-07 confirma la gratuidad de la reclamación ante la empresa, se añade entonces.
Riesgo del cambio: bajo. Se elimina una promesa de coste que la fuente no respalda. Esfuerzo: S.

### 4. [recomendado] content/procedures/reclamar-retraso-vuelo.yaml:11,19
Problema: el paso 1 y el campo `documents` citan la tarjeta de embarque y los justificantes de gastos con `sourceId: aesa-derechos-pasajeros`, pero la página citada (la portada de "Derechos de los pasajeros" de AESA) no menciona documentación alguna: solo enlaza a "Inicia tu reclamación con AESA". La afirmación es cierta: la he comprobado hoy en la subpágina `https://www.seguridadaerea.gob.es/es/ambitos/derechos-de-los-pasajeros/inicia-tu-reclamacion-con-aesa`, que lista "Tarjeta de embarque, billete o contrato de transporte", "Documento identificativo" y "Tickets, facturas o documentos acreditativos del gasto y del concepto del gasto que reclamas". Pero esa subpágina no está en `sources`.
Propuesta: añadir la subpágina como segunda fuente (`aesa-inicia-reclamacion`, kind `oficial`, `retrievedOn` de hoy) y apuntar a ella el paso 1 y el `documents`. De paso corrige la frase del documento de tarea (línea 44: "es la única fuente que los menciona", que es falsa para la fuente citada).
Riesgo del cambio: bajo. Es añadir la fuente que ya respalda el texto; no cambia ni una palabra de contenido. Esfuerzo: S.

### 5. [nota] content/procedures/baja-linea-telefono.yaml:22-24
Problema: la fuente dice que el plazo para acudir a la Oficina es "de tres meses contados desde la respuesta del operador o la finalización del plazo de un mes". La ficha no lo afirma (correcto si la decisión es no añadirlo en esta ola), pero una persona que leyera solo el aviso de "un mes" podría creer que el derecho caduca ahí.
Propuesta: valorar en H-07 añadir ese segundo plazo como deadline o aviso; está en la fuente citada y es gratis. No bloquea esta tarea.
Riesgo del cambio: bajo. Esfuerzo: S. Si se hace, pasa por H-07, no por la ronda de correcciones.

### 6. [nota] content/procedures/reclamar-retraso-vuelo.yaml
Problema: la ficha solo tiene dos pasos, `deadlines: []` y ningún importe. La pregunta es si parece completa: el aviso en `warnings` (líneas 21-24) lo dice explícitamente y la nota de verificación encaja lo que falta en H-07, así que el señalado es correcto. El único matiz: quien lea solo los pasos (sin `warnings`) ve un trámite de dos líneas.
Propuesta: nada en esta tarea. La renderización (MOD-01) es la que decidirá si `warnings` se muestra junto a los pasos.
Riesgo del cambio: ninguno. Esfuerzo: ninguno.

## Qué se aplicó en la ronda de correcciones

- Hallazgo 1 (bloqueante), aplicado: la ficha de portabilidad afirmaba el proceso de contratación y consentimiento, que la fuente no dice porque es una página de reclamaciones. Reescrita con lo que sí dice: reclamar al operador por sus canales y, si en un mes no hay respuesta o no satisface, acudir a la Oficina. El proceso y el plazo de ejecución quedan en un aviso y en la nota de verificación.
- Hallazgo 2 (bloqueante), aplicado: la ficha de baja atribuía al proceso de baja los canales y la aceptación telefónica que la fuente da para las reclamaciones. Ahora la ficha se llama "Reclamar por la baja de una línea" y sus pasos son los de la reclamación, que es lo que la fuente sostiene. Se añade un aviso con el plazo de la Oficina pendiente de verificar.
- Hallazgo 3 (bloqueante), aplicado: `cost` decía que reclamar a la empresa era gratuito, y la fuente solo dice que es gratuito el sistema de resolución alternativa de litigios. Corregido.
- Hallazgo 4 (recomendado), aplicado por la vía segura: la ficha de vuelo ya no afirma documentación ninguna. Se queda el paso que sostiene la fuente, la reclamación en la sede electrónica de AESA, y un aviso que dice lo que falta, en lugar de citar una subpágina que no se ha podido consultar.
- Hallazgo 5 (nota), recogido: el plazo de tres meses para acudir a la Oficina que la fuente menciona queda en la lista de H-07 de la tarea, sin escribirlo como plazo propio porque el evento del que corre no está confirmado.

Resultado: 24 fichas válidas, `pnpm check` y `pnpm e2e` en verde.
Rellena el implementador.
