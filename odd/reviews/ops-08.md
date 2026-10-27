# Review gate OPS-08: decisiones de cuentas, releases y OCR

---
tarea: OPS-08
base: f916dc2
revisado: 6b2f0e4
revisor: jd-judge-a (contexto limpio, solo lectura)
veredicto: aprobado con cambios
---

## Resumen

La decisión de cuentas no abre ninguna puerta a un login clásico ni a un servidor con datos en claro: describe como camino multidispositivo la copia cifrada y la importación, que son exactamente lo implementado en `packages/vault`, y deja la sincronización ciega como posibilidad condicionada a revisión legal. GitHub Releases encaja para publicar binarios y no promete nada que no esté hecho: el actualizador sigue pendiente. Sin rayas largas ni secretos en el diff.

## Hallazgos

### 1. [bloqueante] docs/backlog.md:14 y 16, y el documento de tarea

Problema: el backlog remitía a D-12 y D-13, pero esas filas no existían en la sección 19; el diff solo cambiaba D-06 y las tareas figuraban como hechas. Quien leyera "canal decidido, D-12" no encontraba la decisión.
Causa real: la comprobación de la inserción buscaba la cadena "D-12" en el texto y la encontraba dentro de `MOD-12`, así que se saltaba.
Propuesta: insertar con un ancla exacta. Aplicado: las dos filas están en la tabla.

### 2. [recomendado] docs/ARRANQUE.md:1572 (D-06)

Problema: el criterio para reconsiderar la decisión era "más de una quinta parte de las personas pide multidispositivo", y el proyecto prohíbe la analítica, así que nadie podría contarlo.
Propuesta: un criterio medible. Aplicado: veinte o más peticiones escritas en seis meses por el canal de contacto del repositorio, o el caso del familiar que gestiona papeles de otro.

### 3. [recomendado] odd/tasks/ops-08-decisiones.md:39 (D-13)

Problema: "unos 15 MB" aparecía sin fuente y sin decir qué modelo; además chocaba con el criterio de DOCS-01 de "ninguna petición de red durante la extracción".
Propuesta: nombrar el modelo, medir el tamaño y resolver el conflicto por escrito. Aplicado: D-13 nombra el modelo `best` de español con su tamaño, y el criterio de DOCS-01 distingue el PDF, que no hace ninguna petición, del OCR, que descarga una vez del propio origen y falla el test si aparece un origen ajeno.

### 4. [nota] D-06 y la privacidad

La sincronización ciega saca del dispositivo un bloque cifrado. El requisito de revisión legal y el condicional lo acotan; conviene añadir "sin metadatos en claro" cuando se redacte la tarea.

### 5. [nota] D-01

Quedó respondida por el trabajo de interfaz ya fusionado (acento de la marca y Host Grotesk autoalojada) y seguía listada como pendiente. Aplicado: marcada como decidida y retirada de las tareas humanas pendientes.

### 6. [nota] Título de la sección 19

Decía "Decisiones abiertas" y ya mezclaba decididas. Aplicado: "Decisiones de producto".

## Secretos

Ninguno.

## Qué se aplicó en la ronda de correcciones

Los tres hallazgos y las dos notas accionables. Lo que queda como nota es la redacción futura de la sincronización ciega.
