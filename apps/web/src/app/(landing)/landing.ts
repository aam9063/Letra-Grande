/**
 * Datos de la landing (UI-03). Traducción de las constantes del mockup
 * `Landing.dc.html` a TypeScript. Todos los nombres, DNI y empresas son
 * ficticios; no hay plazos ni importes que no estén respaldados: la cifra de
 * «15 días de antelación» del mockup se retiró por falta de fuente.
 *
 * Valores derivados del acento (el mockup los calcula en tiempo de ejecución
 * con color-mix; aquí van precalculados con su derivación comentada):
 * - onAccent: contraste(tinta #141414, acento) = 5.5:1 gana a
 *   contraste(blanco, acento) = 3.3:1; el texto sobre acento es tinta.
 * - accentText: acento mezclado al 62 % con negro = #26605C (7.2:1 sobre
 *   blanco); coincide con el color de enlaces del <style> del mockup.
 * - accentSoft: acento mezclado al 10 % con blanco = #ECF5F4.
 */

export const acento = "#3E9B94";
export const acentoTexto = "#141414";
export const acentoEnlace = "#26605C";
export const acentoSuave = "#ECF5F4";

export const enlacesNav = [
  { etiqueta: "Cómo funciona", href: "#como" },
  { etiqueta: "Qué incluye", href: "#incluye" },
  { etiqueta: "Privacidad", href: "#privacidad" },
  { etiqueta: "Datos", href: "#datos" },
  { etiqueta: "Preguntas", href: "#preguntas" },
] as const;

export const radarHero = [
  {
    dia: "29",
    mes: "oct",
    gravedad: "Urgente",
    titulo: "Recurrir la multa de aparcamiento",
    fondo: "#FDEBE9",
    texto: "#9A1B12",
  },
  {
    dia: "14",
    mes: "nov",
    gravedad: "Aviso",
    titulo: "Termina tu permanencia con Ondalia",
    fondo: "#FFF3D6",
    texto: "#6B4500",
  },
] as const;

export const confianza = [
  {
    titulo: "Tus papeles no salen de tu dispositivo",
    texto: "Se guardan cifrados en tu móvil o tu ordenador.",
    d: "M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zM8 11V8a4 4 0 0 1 8 0v3",
  },
  {
    titulo: "Cada respuesta cita su fuente",
    texto: "Y dice cuándo se verificó por última vez.",
    d: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5",
  },
  {
    titulo: "Código abierto",
    texto: "Licencia MIT. Puedes revisarlo y mejorarlo.",
    d: "M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14",
  },
  {
    titulo: "Independiente",
    texto: "Sin vínculos con empresas ni con la Administración.",
    d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8v.01",
  },
] as const;

export const pasos = [
  {
    n: "1",
    titulo: "Cuéntanos qué necesitas",
    texto: "Escribe tu duda con tus palabras: una baja, una reclamación, una ayuda.",
    ejemplo: "\"Quiero dar de baja mi línea sin que me cobren penalización.\"",
    fondo: "#F0F0F3",
    color: "#141414",
  },
  {
    n: "2",
    titulo: "Te guiamos paso a paso",
    texto:
      "Recibes pasos claros, los documentos que necesitas y la carta lista cuando hace falta.",
    ejemplo: "Paso 1 · Mira cuándo termina tu permanencia. Fuente 1",
    fondo: acentoSuave,
    color: "#141414",
  },
  {
    n: "3",
    titulo: "Te avisamos de los plazos",
    texto: "Lo que tiene fecha se añade a tu radar para que no se te pase.",
    ejemplo: "Quedan 3 días para recurrir la multa.",
    fondo: "#FDEBE9",
    color: "#9A1B12",
  },
] as const;

const etiquetaPrimera = { etiqueta: "Primera versión", fondo: "#E6F4EA", color: "#135C2E" } as const;
const etiquetaDespues = { etiqueta: "Después", fondo: "#E3F2F1", color: "#17504B" } as const;

export const modulos = [
  {
    ...etiquetaPrimera,
    titulo: "Asistente",
    texto: "Pregunta con tus palabras y recibe pasos claros con su fuente.",
    d: "M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-4 4v-4a2 2 0 0 1-2-2z",
  },
  {
    ...etiquetaPrimera,
    titulo: "Radar de plazos",
    texto: "Todo lo que vence, ordenado por urgencia y con avisos.",
    d: "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4",
  },
  {
    ...etiquetaPrimera,
    titulo: "Carpeta privada",
    texto: "Facturas, contratos y cartas cifrados en tu dispositivo.",
    d: "M3 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  },
  {
    ...etiquetaPrimera,
    titulo: "Reclamar y bajas",
    texto: "Cartas listas para enviar y los pasos si no te responden.",
    d: "M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 8l9 6 9-6",
  },
  {
    ...etiquetaPrimera,
    titulo: "Factura de luz",
    texto: "Entiende qué pagas y detecta subidas raras en tu recibo.",
    d: "M13 3L5 14h6l-1 7 8-11h-6z",
  },
  {
    ...etiquetaDespues,
    titulo: "Cambios de vida",
    texto: "Mudanza, nacimiento o jubilación: qué hacer y en qué orden.",
    d: "M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z",
  },
  {
    ...etiquetaDespues,
    titulo: "Ayudas",
    texto: "Las ayudas abiertas que pueden corresponderte.",
    d: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  },
  {
    ...etiquetaDespues,
    titulo: "Familia",
    texto: "Gestiona los papeles de tus padres o tus hijos con perfiles separados.",
    d: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6",
  },
  {
    ...etiquetaDespues,
    titulo: "Datos abiertos",
    texto: "Datos oficiales sobre reclamaciones y precios, con su fuente.",
    d: "M4 20V10M10 20V4M16 20v-7M2 20h20",
  },
] as const;

export const privacidad = [
  {
    titulo: "Cifrada en tu dispositivo",
    texto: "Tu carpeta se protege con una contraseña que solo tú conoces.",
  },
  { titulo: "Sin cuenta, sin anuncios", texto: "No te pedimos correo ni teléfono para usarla." },
  {
    titulo: "Solo texto con datos ocultos",
    texto: "Si usas el asistente, a la IA llega únicamente texto ya enmascarado.",
  },
  { titulo: "Borra todo con un botón", texto: "Tus datos son tuyos. Puedes eliminarlos cuando quieras." },
] as const;

export const fiable = [
  { titulo: "Revisadas por personas.", texto: "Cada ficha cita una fuente oficial o de la empresa." },
  { titulo: "Con fecha.", texto: "Verás cuándo se verificó y caduca a los 180 días." },
  {
    titulo: "Cifras comprobadas.",
    texto: "Si un plazo o un importe no está en la fuente, no se muestra.",
  },
] as const;

export const respuesta = [
  { etiqueta: "Dato", texto: "Salir antes de tiempo puede costar una penalización." },
  { etiqueta: "Paso 1", texto: "Mira en tu contrato cuándo termina la permanencia." },
  {
    etiqueta: "Plazo",
    texto: "Avisa con antelación a la fecha de fin de permanencia.",
  },
] as const;

export const datosAbiertos = [
  { titulo: "Fichas de trámites", texto: "Pasos, documentos y fuentes de cada trámite." },
  { titulo: "Precios de la luz", texto: "Datos públicos para entender tu factura." },
  { titulo: "Ayudas abiertas", texto: "Convocatorias y plazos publicados." },
] as const;

export const accesibilidad = [
  { muestra: "Aa", tamaño: "56px", titulo: "Texto grande", texto: "Tres tamaños de letra y mucho espacio entre líneas." },
  { muestra: "Fácil", tamaño: "44px", titulo: "Lectura fácil", texto: "Frases cortas y palabras sencillas, con un interruptor." },
  { muestra: "ES·CA·GL·EU", tamaño: "28px", titulo: "Tu lengua", texto: "Nuestro objetivo es ofrecerla en las lenguas cooficiales." },
  { muestra: "Sin red", tamaño: "44px", titulo: "Sin conexión", texto: "Tu carpeta y tus plazos se abren aunque no tengas internet." },
] as const;

export const instalacion = [
  { n: "1", texto: "Abre Letra Grande en el navegador de tu móvil." },
  { n: "2", texto: "Pulsa \"Instalar\" o \"Añadir a la pantalla de inicio\"." },
  { n: "3", texto: "Ábrela desde el icono, como cualquier otra app." },
] as const;

export const radarMovil = [
  { dia: "29", mes: "oct", titulo: "Recurrir la multa", fondo: "#FDEBE9", texto: "#9A1B12" },
  { dia: "14", mes: "nov", titulo: "Fin de permanencia", fondo: "#FFF3D6", texto: "#6B4500" },
] as const;

export const colaborar = [
  {
    titulo: "Programa",
    texto: "Mejora la app, arregla errores o crea un módulo nuevo. El código y las tareas están en abierto.",
    cta: "Ver el código",
    href: "https://github.com/aam9063/Letra-Grande",
  },
  {
    titulo: "Propón una ficha",
    texto: "Cuéntanos un trámite que te dio guerra y escribe su ficha con la fuente oficial.",
    cta: "Proponer un trámite",
    href: "https://github.com/aam9063/Letra-Grande/issues",
  },
  {
    titulo: "Verifica fichas",
    texto: "Contrasta una ficha con la fuente y firma su verificación. Diez minutos bastan.",
    cta: "Ayudar a verificar",
    href: "https://github.com/aam9063/Letra-Grande/blob/dev/CONTRIBUTING.md",
  },
] as const;

export const preguntas = [
  {
    q: "¿Es gratis?",
    a: "Sí. Letra Grande es gratuita, no tiene anuncios y su código es abierto con licencia MIT.",
  },
  {
    q: "¿Qué pasa con mis documentos?",
    a: "Se guardan cifrados en tu dispositivo y no se suben a ningún servidor. Si olvidas tu contraseña no podemos recuperarlos.",
  },
  {
    q: "¿Qué ve la inteligencia artificial?",
    a: "Solo el texto de tu pregunta con tus datos ocultos: DNI, IBAN, tarjetas, correos y teléfonos. Nombres y direcciones se ocultan si los añades a tu perfil. El proveedor de IA se indicará en la política de privacidad.",
  },
  {
    q: "¿Es asesoramiento legal?",
    a: "No. Es información orientativa con sus fuentes. Para decisiones importantes, consulta con un profesional o con el organismo correspondiente.",
  },
  {
    q: "¿Tenéis relación con las empresas o la Administración?",
    a: "Ninguna. Somos un proyecto independiente y las empresas que aparecen en las pantallas son ejemplos ficticios.",
  },
  {
    q: "¿Cómo sé que una ficha está al día?",
    a: "Cada ficha muestra la fecha de su última verificación y su fuente. Si algo ya no funciona, puedes avisarnos con un botón.",
  },
] as const;

export const columnasFooter = [
  {
    titulo: "Producto",
    enlaces: [
      { texto: "Cómo funciona", href: "#como" },
      { texto: "Qué incluye", href: "#incluye" },
      { texto: "Instalar", href: "#movil" },
    ],
  },
  {
    titulo: "Proyecto",
    enlaces: [
      { texto: "Código en GitHub", href: "https://github.com/aam9063/Letra-Grande" },
      { texto: "Contribuir", href: "https://github.com/aam9063/Letra-Grande/blob/dev/CONTRIBUTING.md" },
      { texto: "Hoja de ruta", href: "https://github.com/aam9063/Letra-Grande/blob/dev/docs/backlog.md" },
    ],
  },
  {
    titulo: "Legal",
    enlaces: [
      { texto: "Privacidad", href: "#privacidad" },
      { texto: "Aviso legal", href: "#preguntas" },
      {
        texto: "Licencia MIT",
        href: "https://github.com/aam9063/Letra-Grande/blob/dev/LICENSE",
      },
    ],
  },
] as const;
