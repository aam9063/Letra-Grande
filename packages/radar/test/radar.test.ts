import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { RadarItem } from "@letra-grande/schema";
import { addDeadline, deadlineStatus, sortRadarItems, toIcs, upcoming } from "../src/index";

/** Elemento de radar ficticio, sin ningún dato personal. */
function item(partial: Partial<RadarItem>): RadarItem {
  return {
    id: "plazo-1",
    profileId: "perfil-demo",
    title: "Plazo de reclamación",
    dueDate: "2026-02-10",
    origin: "procedimiento",
    severity: "info",
    status: "pendiente",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("addDeadline", () => {
  it("suma días naturales sin marcar aproximado", () => {
    expect(addDeadline("2026-01-31", { amount: 10, unit: "dias_naturales" })).toEqual({
      dueDate: "2026-02-10",
      aproximado: false,
    });
  });

  it("acepta un Date y trabaja en UTC", () => {
    const from = new Date(Date.UTC(2026, 6, 15, 23, 59));
    expect(addDeadline(from, { amount: 20, unit: "dias_naturales" })).toEqual({
      dueDate: "2026-08-04",
      aproximado: false,
    });
  });

  it("clamp de fin de mes al sumar meses: 31 de enero más un mes es 28 de febrero de 2026", () => {
    expect(addDeadline("2026-01-31", { amount: 1, unit: "meses" })).toEqual({
      dueDate: "2026-02-28",
      aproximado: false,
    });
  });

  it("clamp de fin de mes en año bisiesto 2028: 31 de enero más un mes es 29 de febrero", () => {
    expect(addDeadline("2028-01-31", { amount: 1, unit: "meses" })).toEqual({
      dueDate: "2028-02-29",
      aproximado: false,
    });
  });

  it("suma meses normales y cruza de año", () => {
    expect(addDeadline("2026-03-15", { amount: 2, unit: "meses" })).toEqual({
      dueDate: "2026-05-15",
      aproximado: false,
    });
    expect(addDeadline("2026-11-20", { amount: 2, unit: "meses" })).toEqual({
      dueDate: "2027-01-20",
      aproximado: false,
    });
  });

  it("clamp de 29 de febrero al sumar años no bisiestos", () => {
    expect(addDeadline("2024-02-29", { amount: 1, unit: "anios" })).toEqual({
      dueDate: "2025-02-28",
      aproximado: false,
    });
  });

  it("29 de febrero más 4 años cae en el siguiente bisiesto", () => {
    expect(addDeadline("2028-02-29", { amount: 4, unit: "anios" })).toEqual({
      dueDate: "2032-02-29",
      aproximado: false,
    });
  });

  it("días hábiles saltan el fin de semana y declaran aproximado", () => {
    // Jueves 5, viernes 6, salta sábado y domingo, lunes 9.
    expect(addDeadline("2026-02-04", { amount: 3, unit: "dias_habiles" })).toEqual({
      dueDate: "2026-02-09",
      aproximado: true,
    });
    // Viernes más un día hábil es el lunes siguiente.
    expect(addDeadline("2026-02-06", { amount: 1, unit: "dias_habiles" })).toEqual({
      dueDate: "2026-02-09",
      aproximado: true,
    });
  });

  it("días hábiles atraviesan varias semanas", () => {
    // Lunes 9: 10 días hábiles terminan el lunes 23 (dos fines de semana saltados).
    expect(addDeadline("2026-02-09", { amount: 10, unit: "dias_habiles" })).toEqual({
      dueDate: "2026-02-23",
      aproximado: true,
    });
  });

  it("rechaza fechas y plazos inválidos", () => {
    expect(() => addDeadline("2026-13-01", { amount: 1, unit: "meses" })).toThrow();
    expect(() => addDeadline("no-es-fecha", { amount: 1, unit: "meses" })).toThrow();
    expect(() => addDeadline("2026-01-31", { amount: 0, unit: "meses" })).toThrow();
    expect(() => addDeadline("2026-01-31", { amount: 1.5, unit: "meses" })).toThrow();
  });
});

describe("deadlineStatus", () => {
  const today = "2026-02-10";

  it("vencido un día antes, hoy el mismo día", () => {
    expect(deadlineStatus(item({ dueDate: "2026-02-09" }), today)).toBe("vencido");
    expect(deadlineStatus(item({ dueDate: "2026-02-10" }), today)).toBe("hoy");
  });

  it("proximo en el borde exacto de 7 días y lejano a partir de 8", () => {
    expect(deadlineStatus(item({ dueDate: "2026-02-17" }), today)).toBe("proximo");
    expect(deadlineStatus(item({ dueDate: "2026-02-18" }), today)).toBe("lejano");
  });

  it("hecho y descartado pasan aunque el plazo esté vencido", () => {
    expect(deadlineStatus(item({ dueDate: "2025-01-01", status: "hecho" }), today)).toBe("hecho");
    expect(deadlineStatus(item({ dueDate: "2025-01-01", status: "descartado" }), today)).toBe("descartado");
  });

  it("acepta un Date como fecha de referencia", () => {
    expect(deadlineStatus(item({ dueDate: "2026-02-10" }), new Date(Date.UTC(2026, 1, 10)))).toBe("hoy");
  });
});

describe("sortRadarItems", () => {
  it("ordena pendientes por fecha ascendente", () => {
    const items = [item({ id: "c", dueDate: "2026-03-01" }), item({ id: "a", dueDate: "2026-01-01" })];
    expect(sortRadarItems(items).map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("es estable para fechas iguales", () => {
    const items = [item({ id: "b", dueDate: "2026-02-10" }), item({ id: "a", dueDate: "2026-02-10" })];
    expect(sortRadarItems(items).map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("deja hecho y descartado después de los pendientes", () => {
    const items = [
      item({ id: "hecho", dueDate: "2026-01-01", status: "hecho" }),
      item({ id: "pend", dueDate: "2026-05-01" }),
      item({ id: "desc", dueDate: "2026-01-02", status: "descartado" }),
    ];
    expect(sortRadarItems(items).map((i) => i.id)).toEqual(["pend", "hecho", "desc"]);
  });

  it("no muta el array original", () => {
    const items = [item({ id: "c", dueDate: "2026-03-01" }), item({ id: "a", dueDate: "2026-01-01" })];
    sortRadarItems(items);
    expect(items.map((i) => i.id)).toEqual(["c", "a"]);
  });
});

describe("upcoming", () => {
  const items = [
    item({ id: "pasado", dueDate: "2026-02-09" }),
    item({ id: "hoy", dueDate: "2026-02-10" }),
    item({ id: "dentro", dueDate: "2026-02-17" }),
    item({ id: "fuera", dueDate: "2026-02-18" }),
    item({ id: "hecho", dueDate: "2026-02-12", status: "hecho" }),
  ];

  it("devuelve los pendientes dentro de la ventana, bordes incluidos", () => {
    expect(upcoming(items, 7, "2026-02-10").map((i) => i.id)).toEqual(["hoy", "dentro"]);
  });
});

describe("toIcs", () => {
  const now = new Date(Date.UTC(2026, 1, 10, 9, 30, 0));
  const items = [
    item({
      id: "plazo-1",
      dueDate: "2026-02-28",
      title: "Reclamación, fase 1: enviar escrito",
    }),
    item({ id: "hecho", dueDate: "2026-02-11", status: "hecho" }),
  ];

  it("genera un calendario con cabecera válida y un VEVENT por pendiente", () => {
    const ics = toIcs(items, { now });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("escribe UID estable, DTSTAMP del reloj inyectado y fechas de todo el día", () => {
    const ics = toIcs(items, { now });
    expect(ics).toContain("UID:plazo-1@letra-grande");
    expect(ics).toContain("DTSTAMP:20260210T093000Z");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260228");
    // El final es el día siguiente: evento de todo el día.
    expect(ics).toContain("DTEND;VALUE=DATE:20260301");
    expect(ics).not.toContain("TZID");
  });

  it("escapa comas, punto y coma, contrabarras y saltos de línea", () => {
    const especial = item({
      id: "especial",
      dueDate: "2026-03-01",
      title: "Texto, con; todo\\ y\nsalto",
    });
    const ics = toIcs([especial], { now });
    expect(ics).toContain("SUMMARY:Texto\\, con\\; todo\\\\ y\\nsalto");
  });

  it("pliega las líneas que superan 75 octetos con un espacio inicial", () => {
    const largo = item({
      id: "largo",
      dueDate: "2026-03-01",
      title: "Plazo muy largo con acentuación: comunicación, reclamación y documentación adicional",
    });
    const ics = toIcs([largo], { now });
    const lineas = ics.split("\r\n");
    expect(lineas.length).toBeGreaterThan(1);
    for (const linea of lineas) {
      expect(new TextEncoder().encode(linea).length).toBeLessThanOrEqual(75);
    }
    expect(lineas.some((l) => l.startsWith(" ") && !l.startsWith("  "))).toBe(true);
    // Al desplegar las líneas se recupera el texto original.
    const desplegado = lineas.reduce((acc, l) => (l.startsWith(" ") ? acc + l.slice(1) : acc + l), "");
    expect(desplegado).toContain(
      "SUMMARY:Plazo muy largo con acentuación: comunicación\\, reclamación y documentación adicional",
    );
  });

  it("usa salto de línea CRLF según RFC 5545", () => {
    const ics = toIcs(items, { now });
    expect(ics).toContain("\r\n");
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/\r|\n/);
  });
});

describe("garantías del paquete", () => {
  it("no hace llamadas de red: no hay fetch en el código del paquete", () => {
    const srcDir = join(import.meta.dirname, "..", "src");
    const archivos = readdirSync(srcDir).filter((f) => f.endsWith(".ts"));
    expect(archivos.length).toBeGreaterThan(0);
    for (const archivo of archivos) {
      const contenido = readFileSync(join(srcDir, archivo), "utf8");
      expect(contenido).not.toMatch(/\bfetch\b/);
      expect(contenido).not.toMatch(/XMLHttpRequest/);
    }
  });

  it("los elementos de prueba no contienen datos personales detectables", () => {
    const fijaciones = [
      item({}),
      item({ id: "plazo-2", title: "Renovación de contrato" }),
      item({ id: "plazo-3", title: "Reclamación, fase 1: enviar escrito" }),
    ];
    const texto = JSON.stringify(fijaciones);
    expect(texto).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/); // correo
    expect(texto).not.toMatch(/\b\d{9}\b/); // teléfono
    expect(texto).not.toMatch(/\b\d{8}[A-Z]\b/); // DNI
  });
});
