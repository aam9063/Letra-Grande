/**
 * Generador del conjunto sintético de documentos para el clasificador.
 *
 * Escribe 36 documentos de texto (6 por tipo) con su verdad esperada en
 * fixtures/documentos/. El texto imita lo que devuelven extractPdfText y
 * extractImageText: una línea por línea, sin maquetación fiable.
 *
 * Todo es ficticio: organismos, empresas, personas, importes y referencias
 * inventadas. Nunca debe contener datos reales ni imitar a una entidad que
 * exista. Los números de teléfono se omiten a propósito.
 *
 * Cada tipo tiene una variante a la que le falta su palabra más característica
 * (por ejemplo, una factura sin la palabra "factura"): así el clasificador no
 * puede apoyarse en una sola pista.
 *
 * Uso: node scripts/make-document-fixtures.mjs [directorio]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino =
  process.argv[2] === undefined ? join(raiz, "fixtures", "documentos") : resolve(process.argv[2]);

/** Facturas: la de luz lleva CUPS y potencia; las de agua, gas y telefonía no. */
const FACTURAS = [
  [
    "Comercializadora Ficticia de Luz S.L.",
    "FACTURA DE LA LUZ",
    "Titular: Persona de Ejemplo Uno",
    "CUPS: ES0021000012345678AB",
    "Periodo de facturación: 01/01/2026 a 31/01/2026",
    "Potencia contratada P1: 4,600 kW",
    "Consumo P1: 128,40 kWh",
    "Importe total: 62,35 EUR",
  ],
  [
    "Telefonía Imaginaria S.A.",
    "Factura de telefonía móvil",
    "Número de factura: 2026-000123",
    "Periodo de facturación: 01/02/2026 a 28/02/2026",
    "Cuota mensual: 19,90 EUR",
    "Consumo de datos: 12,4 GB de 20 GB",
    "Importe total: 23,80 EUR",
  ],
  [
    "Aguas Ficticias Municipales",
    "Factura del agua",
    "Periodo de facturación: 01/03/2026 a 31/03/2026",
    "Lectura anterior: 120 m3",
    "Lectura actual: 128 m3",
    "Consumo: 8 m3",
    "Importe total: 18,45 EUR",
  ],
  [
    "Gas Inventado Distribución S.A.",
    "FACTURA DE GAS NATURAL",
    "Periodo de facturación: 01/04/2026 a 30/04/2026",
    "Consumo: 240 kWh",
    "Término fijo: 6,20 EUR",
    "Término variable: 14,80 EUR",
    "Importe total: 22,10 EUR",
  ],
  [
    // Sin la palabra "factura": solo el detalle de suministro la delata.
    "Comercializadora Ejemplo Verde S.L.",
    "Titular: Persona de Ejemplo Dos",
    "CUPS: ES0031400056789012CD",
    "Periodo de facturación: 01/05/2026 a 31/05/2026",
    "Potencia contratada P1: 5,750 kW",
    "Consumo P1: 96,20 kWh",
    "Consumo P2: 71,80 kWh",
    "Total a pagar: 54,90 EUR",
  ],
  [
    "Operadora Ficticia de Telecomunicaciones S.L.",
    "Factura de fibra y móvil",
    "Número de factura: F-2026-8842",
    "Periodo de facturación: 01/06/2026 a 30/06/2026",
    "Fibra 600 Mb: 29,90 EUR",
    "Línea móvil: 9,90 EUR",
    "Importe total: 48,36 EUR",
  ],
];

/** Contratos: alquiler, telefonía, luz, préstamo, mantenimiento y limpieza. */
const CONTRATOS = [
  [
    "CONTRATO DE ARRENDAMIENTO DE VIVIENDA",
    "Entre las partes: Persona de Ejemplo Uno (arrendadora) y Persona de Ejemplo Dos (arrendataria).",
    "Cláusula primera. Duración: doce meses desde la firma.",
    "Cláusula segunda. Prórroga automática por periodos anuales.",
    "Cláusula tercera. Penalización por desistimiento anticipado: una mensualidad.",
    "Renta mensual: 750,00 EUR.",
    "En prueba de conformidad, firman las partes.",
  ],
  [
    "Contrato de telefonía móvil",
    "Duración: 18 meses desde la activación.",
    "Cláusula de permanencia: 60,00 EUR de penalización si se cancela antes.",
    "Condiciones generales del servicio disponibles en la tienda ficticia.",
    "Firmado por la persona titular y por la operadora.",
  ],
  [
    "CONTRATO DE SUMINISTRO ELÉCTRICO",
    "Las partes acuerdan el suministro en el punto indicado.",
    "Duración inicial: doce meses.",
    "Prórroga automática si ninguna parte avisa con un mes de antelación.",
    "El contrato se rige por las condiciones generales adjuntas.",
    "Firma del cliente: Persona de Ejemplo Tres.",
  ],
  [
    // Sin la palabra "contrato": lo delatan las cláusulas y la firma.
    "PRÉSTAMO PERSONAL",
    "Por una parte, la entidad financiera ficticia; por otra, la persona prestataria.",
    "Cláusula 1. Capital prestado: 6.000,00 EUR.",
    "Cláusula 2. Duración: 24 meses.",
    "Cláusula 3. Penalización por amortización anticipada: 1 % del capital pendiente.",
    "En prueba de conformidad, firma la persona prestataria.",
  ],
  [
    "Contrato de mantenimiento de ascensores",
    "Duración: veinticuatro meses.",
    "Cláusula de prórroga tácita por años.",
    "Condiciones generales: revisiones mensuales y asistencia en 24 horas.",
    "Las partes firman en la fecha indicada.",
  ],
  [
    "CONTRATO DE SERVICIOS DE LIMPIEZA",
    "Cláusula primera. Objeto del contrato: limpieza de oficinas.",
    "Cláusula segunda. Duración: doce meses, con prórroga automática.",
    "Cláusula tercera. Penalización por cancelación con menos de treinta días.",
    "Firmado por las partes en la fecha de la firma.",
  ],
];

/** Cartas oficiales: organismos ficticios, expediente o registro y notificación. */
const CARTAS = [
  [
    "Ayuntamiento de Villaejemplo",
    "Registro de entrada: 2026/000111",
    "Expediente: EXP-2026-42",
    "Estimada persona interesada:",
    "Le informamos de que su escrito ha sido registrado y se ha incorporado al expediente indicado.",
    "Puede presentar alegaciones en el plazo de diez días.",
    "Atentamente, la Concejalía de Ejemplo.",
  ],
  [
    "Consejería de Consumo de la Comunidad Ejemplo",
    "Número de registro: 2026-5566",
    "Notificación de resolución",
    "Le comunicamos la resolución del expediente de consumo iniciado a su instancia.",
    "Contra esta resolución puede interponer recurso de alzada.",
    "La Directora General de Ejemplo.",
  ],
  [
    "Agencia Ficticia de Consumo",
    "Expediente: AC-2026-778",
    "Le informamos de que se ha recibido su reclamación y se traslada a la empresa afectada.",
    "Puede consultar el estado del expediente en la oficina de ejemplo.",
    "Atentamente, el Área de Atención a la Ciudadanía.",
  ],
  [
    // Sin la palabra "expediente": lo delatan el organismo y la notificación.
    "Dirección General de Ejemplo",
    "Recibido en el registro de entrada con fecha 12/03/2026.",
    "Le comunicamos que su solicitud ha sido admitida a trámite.",
    "Puede presentar un escrito de alegaciones en el plazo indicado.",
    "Atentamente, el Servicio de Ejemplo.",
  ],
  [
    "Juzgado de Ejemplo número 3",
    "Notificación de providencia",
    "Expediente judicial: 2026/99",
    "Se le cita para el acto indicado en la sede del juzgado.",
    "Contra esta providencia cabe recurso de reposición.",
    "El Letrado de la Administración de Justicia de Ejemplo.",
  ],
  [
    "Ministerio de Ejemplo",
    "Registro de entrada: ME-2026-3141",
    "Resolución de la Dirección General de Ejemplo",
    "Le informamos de que se ha resuelto el procedimiento iniciado.",
    "Contra esta resolución puede interponer recurso de alzada en el plazo legal.",
    "Atentamente, la Subdirección de Ejemplo.",
  ],
];

/** Multas: tráfico, transporte, residuos y ordenanzas ficticias. */
const MULTAS = [
  [
    "Ayuntamiento de Villaejemplo",
    "Boletín de denuncia por estacionamiento",
    "Expediente sancionador: SAN-2026-101",
    "Vehículo con matrícula ficticia 0000AAA",
    "Infracción: estacionar en zona reservada.",
    "Importe a ingresar: 90,00 EUR",
    "Con pago voluntario en 20 días, descuento del 50 %.",
  ],
  [
    "Organismo Ficticio de Tráfico",
    "Notificación de sanción por exceso de velocidad",
    "Vehículo: turismo con matrícula ficticia 1111BBB",
    "Infracción grave según el boletín de denuncia.",
    "Importe a ingresar: 200,00 EUR",
    "Puntos: 4",
    "Pago voluntario con descuento dentro del plazo.",
  ],
  [
    "Empresa Ficticia de Transporte Urbano",
    "Denuncia por viajar sin título de transporte",
    "Importe a ingresar: 60,00 EUR",
    "Con pago voluntario en 15 días, descuento del 40 %.",
    "Si no se abona, se remite al expediente sancionador del organismo competente.",
  ],
  [
    "Ayuntamiento de Villaejemplo",
    "Expediente sancionador por residuos",
    "Sanción por depósito de enseres fuera del horario permitido.",
    "Importe a ingresar: 120,00 EUR",
    "Plazo de 20 días para el pago voluntario.",
    "Contra esta sanción cabe recurso de reposición.",
  ],
  [
    // Sin la palabra "denuncia": lo delatan la sanción y el importe.
    "Ayuntamiento de Villaejemplo",
    "Ordenanza municipal de ejemplo",
    "Expediente sancionador: ORD-2026-55",
    "Infracción: ruido excesivo en horario de descanso.",
    "Importe a ingresar: 150,00 EUR",
    "Con pago voluntario, descuento del 30 %.",
  ],
  [
    "Organismo Ficticio de Inspección",
    "Acta de inspección con propuesta de sanción",
    "Establecimiento de ejemplo, actividad ficticia.",
    "Infracción comprobada en la inspección del 04/05/2026.",
    "Importe a ingresar: 300,00 EUR",
    "Pago voluntario dentro del plazo de 20 días.",
  ],
];

/** Tickets: comercios ficticios, caja, efectivo y total. */
const TICKETS = [
  [
    "Supermercado de Ejemplo S.L.",
    "Ticket de compra",
    "Caja 3",
    "Artículos: 12 unidades",
    "Leche, pan, fruta y limpieza",
    "IVA incluido",
    "Total: 24,70 EUR",
    "Pago en efectivo. Gracias por su compra.",
  ],
  [
    "Gasolinera Imaginada",
    "Resguardo de compra",
    "Surtidor 2",
    "Carburante: 32,15 litros",
    "IVA incluido",
    "Total: 45,00 EUR",
    "Pago con tarjeta. Vuelva pronto.",
  ],
  [
    "Farmacia Ficticia",
    "Ticket de compra",
    "Artículos: 3 unidades",
    "Total: 12,35 EUR",
    "IVA incluido",
    "Pago en efectivo. Cambio: 0,65 EUR.",
  ],
  [
    "Cafetería Imaginaria",
    "Ticket",
    "Caja 1",
    "Dos cafés y un bocadillo",
    "Total: 7,20 EUR",
    "Pago en efectivo.",
  ],
  [
    // Sin la palabra "ticket": lo delatan la compra y la caja.
    "Tienda de Ejemplo",
    "Resguardo de compra",
    "Artículos: 2 unidades",
    "Base imponible: 16,53 EUR",
    "IVA incluido",
    "Total: 20,00 EUR",
    "Pago con tarjeta.",
  ],
  [
    "Aparcamiento Ficticio",
    "Ticket de aparcamiento",
    "Entrada: 10:15, salida: 11:45",
    "Total: 3,20 EUR",
    "Pago en efectivo en caja.",
  ],
];

/** Pólizas: seguros ficticios de hogar, coche, vida, salud, viaje y mascota. */
const POLIZAS = [
  [
    "Aseguradora de Ejemplo S.A.",
    "PÓLIZA DE HOGAR",
    "Tomador: Persona de Ejemplo Uno",
    "Asegurado: Persona de Ejemplo Uno",
    "Vigencia: 01/01/2026 a 31/12/2026",
    "Prima anual: 210,00 EUR",
    "Coberturas: incendio, robo y daños por agua.",
    "Franquicia: 150,00 EUR",
  ],
  [
    "Seguros Ficticios del Sur",
    "Póliza de automóvil",
    "Asegurado: Persona de Ejemplo Dos",
    "Vigencia: 01/02/2026 a 31/01/2027",
    "Prima: 430,50 EUR",
    "Coberturas: responsabilidad civil y lunas.",
    "Para declarar un siniestro, llame al teléfono indicado en la póliza.",
  ],
  [
    "Aseguradora Imaginaria",
    "PÓLIZA DE VIDA",
    "Tomador y asegurado: Persona de Ejemplo Tres",
    "Prima mensual: 18,40 EUR",
    "Cobertura principal: fallecimiento.",
    "Vigencia: anual renovable.",
  ],
  [
    // Sin la palabra "póliza": lo delatan la prima y las coberturas.
    "Mutua Ficticia de Salud",
    "Cuadro de coberturas del seguro de salud",
    "Asegurado: Persona de Ejemplo Uno",
    "Prima mensual: 42,00 EUR",
    "Coberturas: consultas, urgencias y hospitalización.",
    "Franquicia en prótesis: 100,00 EUR",
    "Vigencia: 01/03/2026 a 28/02/2027",
  ],
  [
    "Seguros de Viaje de Ejemplo",
    "Póliza de asistencia en viaje",
    "Asegurado: Persona de Ejemplo Dos",
    "Prima única: 25,00 EUR",
    "Coberturas: cancelación, equipaje y asistencia médica.",
    "Siniestro: comuníquelo desde el país de destino.",
  ],
  [
    "Aseguradora Ficticia de Mascotas",
    "Póliza de mascota",
    "Tomador: Persona de Ejemplo Tres",
    "Prima anual: 96,00 EUR",
    "Coberturas: veterinario y responsabilidad civil.",
    "Vigencia: 01/04/2026 a 31/03/2027",
  ],
];

/** Documentos del conjunto, con su tipo, en el orden en que se escriben. */
const DOCUMENTOS = [
  ...FACTURAS.map((lineas, indice) => ({ id: `factura-${indice + 1}`, tipo: "factura", lineas })),
  ...CONTRATOS.map((lineas, indice) => ({ id: `contrato-${indice + 1}`, tipo: "contrato", lineas })),
  ...CARTAS.map((lineas, indice) => ({ id: `carta-${indice + 1}`, tipo: "carta_oficial", lineas })),
  ...MULTAS.map((lineas, indice) => ({ id: `multa-${indice + 1}`, tipo: "multa", lineas })),
  ...TICKETS.map((lineas, indice) => ({ id: `ticket-${indice + 1}`, tipo: "ticket", lineas })),
  ...POLIZAS.map((lineas, indice) => ({ id: `poliza-${indice + 1}`, tipo: "poliza", lineas })),
];

/** Pie común: deja escrito que el documento es ficticio, también para quien lo lea. */
const PIE = "Documento ficticio generado para las pruebas de Letra Grande.";

mkdirSync(destino, { recursive: true });

const verdad = {};
for (const documento of DOCUMENTOS) {
  const lineas = [...documento.lineas, "", PIE];
  writeFileSync(join(destino, `${documento.id}.txt`), `${lineas.join("\n")}\n`, "utf8");
  verdad[documento.id] = documento.tipo;
}
writeFileSync(
  join(destino, "verdad.json"),
  `${JSON.stringify({ documentos: verdad }, null, 2)}\n`,
  "utf8",
);

console.log(`${DOCUMENTOS.length} documentos sintéticos y su verdad en ${destino}`);
