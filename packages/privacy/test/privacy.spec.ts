import { describe, expect, it } from "vitest";
import { detect, isSafeToSend, mask, unmask } from "../src/index.js";

// NIE con prefijo Y: el número equivalente es 1 seguido de los 7 dígitos.
const NIE_Y = 10_000_000 + 1234567;
// NIE con prefijo Z: el número equivalente es 2 seguido de los 7 dígitos.
const NIE_Z = 20_000_000 + 7654321;

// Vectores de la sección 9 de docs/ARRANQUE.md. Todos ficticios o de ejemplo público.
describe("Vectores de la sección 9", () => {
  it("12345678Z es documento válido", () => {
    const dets = detect("12345678Z");
    expect(dets).toHaveLength(1);
    expect(dets[0]?.kind).toBe("documento");
    expect(dets[0]?.valid).toBe(true);
    expect(dets[0]?.value).toBe("12345678Z");
  });

  it("12345678A es documento con valid:false y se enmascara igualmente", () => {
    const dets = detect("12345678A");
    expect(dets).toHaveLength(1);
    expect(dets[0]?.kind).toBe("documento");
    expect(dets[0]?.valid).toBe(false);
    const { masked, mapping } = mask("12345678A");
    expect(masked).toBe("{{documento_1}}");
    expect(mapping["{{documento_1}}"]).toBe("12345678A");
  });

  it("X1234567L es documento NIE válido", () => {
    const dets = detect("X1234567L");
    expect(dets).toHaveLength(1);
    expect(dets[0]?.kind).toBe("documento");
    expect(dets[0]?.valid).toBe(true);
  });

  it("ES91 2100 0418 4502 0005 1332 es iban válido", () => {
    const dets = detect("ES91 2100 0418 4502 0005 1332");
    expect(dets).toHaveLength(1);
    expect(dets[0]?.kind).toBe("iban");
    expect(dets[0]?.valid).toBe(true);
  });

  it("4111 1111 1111 1111 es tarjeta (pasa Luhn)", () => {
    const dets = detect("4111 1111 1111 1111");
    expect(dets).toHaveLength(1);
    expect(dets[0]?.kind).toBe("tarjeta");
    expect(dets[0]?.valid).toBe(true);
  });

  it("4111 1111 1111 1112 no se enmascara (falla Luhn)", () => {
    const dets = detect("4111 1111 1111 1112");
    expect(dets.filter((d) => d.kind === "tarjeta")).toHaveLength(0);
    const { masked } = mask("4111 1111 1111 1112");
    expect(masked).toBe("4111 1111 1111 1112");
  });

  it("ana@example.com es email", () => {
    const dets = detect("ana@example.com");
    expect(dets).toHaveLength(1);
    expect(dets[0]?.kind).toBe("email");
    expect(dets[0]?.valid).toBe(true);
  });

  it("612 34 56 78 es teléfono", () => {
    const dets = detect("612 34 56 78");
    expect(dets).toHaveLength(1);
    expect(dets[0]?.kind).toBe("telefono");
    expect(dets[0]?.valid).toBe(true);
  });

  it("+34 612345678 es teléfono", () => {
    const dets = detect("+34 612345678");
    expect(dets).toHaveLength(1);
    expect(dets[0]?.kind).toBe("telefono");
    expect(dets[0]?.valid).toBe(true);
  });

  it("el 12345678 a las 10 no se enmascara como DNI", () => {
    const dets = detect("el 12345678 a las 10");
    expect(dets.filter((d) => d.kind === "documento")).toHaveLength(0);
    const { masked } = mask("el 12345678 a las 10");
    expect(masked).toBe("el 12345678 a las 10");
  });

  it("el nombre del perfil en distinto caso se enmascara como {{nombre_1}}", () => {
    const opts = { knownTerms: [{ kind: "nombre" as const, value: "Ana García" }] };
    const { masked, mapping } = mask("Contacto: ANA GARCÍA y ana garcía.", opts);
    expect(masked).toBe("Contacto: {{nombre_1}} y {{nombre_1}}.");
    expect(mapping["{{nombre_1}}"]).toBe("Ana García");
  });

  it("mask seguido de unmask devuelve el texto original", () => {
    const texto = "DNI 12345678Z, IBAN ES91 2100 0418 4502 0005 1332, ana@example.com";
    const { masked, mapping } = mask(texto);
    expect(unmask(masked, mapping)).toBe(texto);
  });

  it("isSafeToSend(mask(x).masked) es true", () => {
    const texto = "DNI 12345678Z y ana@example.com";
    const { masked } = mask(texto);
    expect(isSafeToSend(masked)).toBe(true);
  });

  it("detect sobre texto ya enmascarado devuelve lista vacía", () => {
    const { masked } = mask("DNI 12345678Z, ana@example.com, 612 34 56 78");
    expect(detect(masked)).toEqual([]);
  });
});

// Casos límite de prioridad, normalización y solapes.
describe("Casos límite", () => {
  it("un IBAN que falla el módulo 97 se marca valid:false y se enmascara igualmente", () => {
    const dets = detect("ES00 0000 0000 0000 0000 0000");
    expect(dets).toHaveLength(1);
    expect(dets[0]?.kind).toBe("iban");
    expect(dets[0]?.valid).toBe(false);
    const { masked } = mask("ES00 0000 0000 0000 0000 0000");
    expect(masked).toBe("{{iban_1}}");
  });

  it("un CUPS ficticio se detecta y se enmascara", () => {
    const cups = "ES0123456789012345ZP1X";
    const dets = detect(cups);
    expect(dets).toHaveLength(1);
    expect(dets[0]?.kind).toBe("cups");
    const { masked, mapping } = mask(cups);
    expect(masked).toBe("{{cups_1}}");
    expect(mapping["{{cups_1}}"]).toBe(cups);
  });

  it("teléfonos equivalentes comparten marcador: solo cuentan los 9 dígitos", () => {
    const { masked, mapping } = mask("Llama al +34 612345678 o al 612 34 56 78");
    expect(masked).toBe("Llama al {{telefono_1}} o al {{telefono_1}}");
    expect(mapping["{{telefono_1}}"]).toBe("+34 612345678");
  });

  it("emails en distinto caso comparten marcador", () => {
    const { masked } = mask("ana@example.com y ANA@EXAMPLE.COM");
    expect(masked).toBe("{{email_1}} y {{email_1}}");
  });

  it("documentos distintos se numeran y la repetición reutiliza el marcador", () => {
    const { masked, mapping } = mask("12345678Z, 12345678Z, 87654321X");
    expect(masked).toBe("{{documento_1}}, {{documento_1}}, {{documento_2}}");
    expect(mapping["{{documento_1}}"]).toBe("12345678Z");
    expect(mapping["{{documento_2}}"]).toBe("87654321X");
  });

  it("NIE con prefijo Y y Z se validan con la serie oficial", () => {
    const letraY = "TRWAGMYFPDXBNJZSQVHLCKE"[NIE_Y % 23];
    const letraZ = "TRWAGMYFPDXBNJZSQVHLCKE"[NIE_Z % 23];
    expect(detect(`Y1234567${letraY}`).every((d) => d.valid)).toBe(true);
    expect(detect(`Z7654321${letraZ}`).every((d) => d.valid)).toBe(true);
    expect(detect(`Y1234567${letraZ}`)[0]?.valid).toBe(false);
  });

  it("unmask deja intactos los placeholders que no están en el mapping", () => {
    expect(unmask("{{documento_9}} y {{email_1}}", { "{{email_1}}": "ana@example.com" })).toBe(
      "{{documento_9}} y ana@example.com",
    );
  });

  it("isSafeToSend devuelve false si queda algún dato personal", () => {
    expect(isSafeToSend("tu DNI es 12345678Z")).toBe(false);
  });

  it("mask sin datos personales devuelve el texto igual y un mapping vacío", () => {
    const { masked, mapping, detections } = mask("Factura de la luz de julio");
    expect(masked).toBe("Factura de la luz de julio");
    expect(mapping).toEqual({});
    expect(detections).toEqual([]);
  });

  it("un término conocido respeta los límites Unicode: Ana no aparece dentro de Anana", () => {
    const opts = { knownTerms: [{ kind: "nombre" as const, value: "Ana" }] };
    expect(mask("Anana", opts).masked).toBe("Anana");
    expect(mask("de Ana.", opts).masked).toBe("de {{nombre_1}}.");
  });

  it("un término conocido gana al teléfono cuando solapan", () => {
    const opts = { knownTerms: [{ kind: "otro" as const, value: "612 34 56 78" }] };
    const { masked, mapping } = mask("Llama al 612 34 56 78", opts);
    expect(masked).toBe("Llama al {{otro_1}}");
    expect(mapping["{{otro_1}}"]).toBe("612 34 56 78");
  });

  it("una tarjeta con guiones pasa Luhn y se enmascara", () => {
    const dets = detect("4111-1111-1111-1111");
    expect(dets).toHaveLength(1);
    expect(dets[0]?.kind).toBe("tarjeta");
  });

  it("la otra tarjeta de prueba habitual (5500...) pasa Luhn y se enmascara", () => {
    const dets = detect("5500 0000 0000 0004");
    expect(dets).toHaveLength(1);
    expect(dets[0]?.kind).toBe("tarjeta");
    expect(dets[0]?.valid).toBe(true);
  });

  it("mask es idempotente sobre texto ya enmascarado", () => {
    const { masked } = mask("DNI 12345678Z y ana@example.com");
    expect(mask(masked).masked).toBe(masked);
    expect(mask(masked).mapping).toEqual({});
  });
});
