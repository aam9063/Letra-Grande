# CONTENT-02: fichas de comercializadoras y operadoras

## Objetivo y motivo

Con los organismos ya escritos (CONTENT-03), faltan las empresas contra las que se reclama. Sin sus canales, MOD-02 (bajas) no tiene a dónde mandar a nadie y MOD-01 no puede empezar por la empresa. Esta tarea escribe las diez fichas de las cinco mayores comercializadoras de electricidad y las cinco mayores operadoras, como **borradores con fuente de la propia empresa**, para que H-07 los verifique.

## Alcance y restricciones

- Dentro: `content/companies/` con Iberdrola, Endesa, Naturgy, Repsol y TotalEnergies (energía) y Movistar, Vodafone, Orange, Yoigo y Digi (telefonía).
- Fuera: teléfonos y direcciones de correo (van en la verificación humana, cuando se pueda comprobar que siguen vigentes), permanencias (no se han consultado), plantillas de carta (MOD-02) y el resto de comercializadoras.
- Invariantes:
  - **Nada inventado**: cada canal cita su `sourceId`, y la fuente es la página oficial de la propia empresa consultada hoy.
  - `verified: false` en todas, con su nota: los canales son un borrador.
  - Sin teléfonos inventados. Un canal que no se ha podido comprobar no se escribe.
  - `kind: empresa` en las fuentes, porque son páginas de la compañía y para verificar hacen falta fuentes oficiales o de la empresa.

## Superficie de edición (nuestra)

`content/companies/**`, `docs/backlog.md`, `odd/tasks/content-02-empresas.md`.

## Modo TDD (nuestra)

- No hay lógica nueva: la comprobación es `pnpm content:validate`, que exige que cada `sourceId` de cada canal exista en la ficha, slugs, sectores y coherencia de la verificación.

## Riesgo y review (nuestra)

- Tipo: contenido.
- Review gate: obligatorio (sección 22).
- Riesgo: elemento 1 (una URL equivocada manda a la persona a un sitio que no es el de su compañía). Todo va con fuente de la empresa y `verified: false`.

## Tareas

- [x] Documento de funcionalidad antes de escribir las fichas.
- [x] Localizar la página oficial de atención al cliente o reclamaciones de cada compañía.
- [x] Comprobar que cada URL responde y es del dominio de la empresa.
- [x] Escribir las diez fichas con su escalado a los organismos de CONTENT-03.
- [x] `pnpm content:validate` en verde.
- [x] Backlog actualizado y lista de pendientes para H-07.

## Evidencia y progreso

Rama `lg/content-02-empresas`.

- Diez fichas: cinco de energía y cinco de telefonía, cada una con el canal web de atención o de reclamaciones, su `sourceId` y el escalado a los organismos (`consumo-estatal` y `consumo-comunitat-valenciana` para energía; además la Oficina de Atención al Usuario de Telecomunicaciones para telefonía).
- URL comprobadas el 2026-10-28: nueve de diez responden y son la página oficial de la compañía. **Iberdrola bloquea el acceso automatizado** (403 en todo el dominio, también en la portada), así que su URL está citada pero marcada como no comprobada en la nota de la ficha: es un punto explícito de H-07.
- Sin teléfonos: las páginas los tienen, pero un número que caduca es peor que un hueco, y esa comprobación es humana.

- El canal `reclamacion` solo se rellena donde la fuente citada es una página de reclamaciones de la compañía (Movistar, Vodafone, Orange y Yoigo). En las otras seis queda vacío: la página de contacto no acredita una vía de reclamación concreta, y rellenarlo con la misma URL sería afirmar más de lo que dice la fuente.
- El escalado autonómico apunta a `consumo-comunitat-valenciana` porque es la única ficha autonómica que existe (D-08). Para el resto de comunidades hace falta ficha propia, y eso está en DATA-05: la ficha no debe leerse como que Valencia sea el organismo de toda España.
- «Las cinco mayores» es el criterio de alcance que fija el backlog, no un dato de las fichas: no se ha medido con una fuente de cuotas de mercado y la ficha no lo afirma.

## Pendientes para H-07 (lista única)

1. Iberdrola: abrir la URL en un navegador (el sitio bloquea el acceso automatizado con 403) y confirmar que es la página de atención al cliente.
2. Las diez: confirmar que el canal sigue existiendo y, si se quiere añadir teléfono, comprobar que el número es el de la compañía.
3. Las cuatro con canal de reclamación: confirmar que la página sigue siendo la vía de reclamación.
4. Decidir si se añaden horarios o permanencias, que hoy no están porque no se han consultado.

## Siguiente paso

H-07: verificar las diez fichas (abrir la URL en un navegador, comprobar el canal y decidir si se añaden teléfonos) y las siete de organismos.

## Cambios de alcance aceptados

1. Se incluye TotalEnergies entre las cinco comercializadoras y se deja fuera Holaluz: el criterio es las cinco mayores, y la ficha de Holaluz no aporta nada nuevo al conjunto.
2. Los teléfonos no se escriben en esta tarea: se añaden en la verificación, cuando una persona pueda comprobar que el número sigue siendo el de la compañía.
