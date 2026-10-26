/**
 * Datos del onboarding (UI-05), adaptados de la app de referencia (reforma
 * digital) a nuestra privacidad real. Sobre terceros solo se dice lo que se
 * puede saber: el texto se formula con «normalmente» o «suelen».
 */

export interface TarjetaBienvenida {
  readonly titulo: string;
  readonly texto: string;
  readonly d: string;
}

export const bienvenida = {
  titulo: "Los trámites, claros",
  subtitulo: "Pregunta con tus palabras y recibe los pasos, con la fuente de cada uno.",
  tarjetas: [
    {
      titulo: "Pregunta con tus palabras",
      texto: "Una baja, una reclamación o una ayuda: lo escribes como lo dirías en casa.",
      d: "M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-4 4v-4a2 2 0 0 1-2-2z",
    },
    {
      titulo: "Pasos con su fuente",
      texto: "Cada paso y cada cifra citan la fuente, y ves cuándo se verificó.",
      d: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 14l2 2 4-4",
    },
    {
      titulo: "Te avisamos de los plazos",
      texto: "Lo que tiene fecha entra en tu radar, ordenado por urgencia.",
      d: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4",
    },
  ] as const satisfies readonly TarjetaBienvenida[],
};

export interface FilaComparativa {
  readonly tema: string;
  readonly general: string;
  readonly propio: string;
}

export const comparativa = {
  titulo: "¿Por qué no ChatGPT, Claude o Gemini?",
  subtitulo:
    "Son muy buenos asistentes generales. Para un trámite con tus datos, este está hecho a propósito.",
  columnas: { general: "Un asistente general", propio: "Letra Grande" },
  filas: [
    {
      tema: "Tus datos",
      general: "Normalmente le llega lo que escribes, con tu nombre y tu documento.",
      propio:
        "El texto se enmascara en tu dispositivo antes de salir: a la IA llegan marcadores, no tus datos.",
    },
    {
      tema: "Tus conversaciones",
      general: "Suelen ir al proveedor y guardarse según su política.",
      propio: "Nuestro proxy no guarda el contenido de lo que envías ni hace logs.",
    },
    {
      tema: "Los trámites",
      general: "Sabe de todo un poco; el trámite se lo explicas tú.",
      propio: "Hecho para trámites en España, con fichas verificadas y su fuente.",
    },
    {
      tema: "Enviar y firmar",
      general: "Depende de la herramienta y de cómo la configures.",
      propio: "Nada se envía sin tu aprobación: las contraseñas y las firmas las pones tú.",
    },
  ] as const satisfies readonly FilaComparativa[],
};

export const seguridad = {
  titulo: "Tu seguridad, primero",
  subtitulo: "Así viaja una petición con tus datos.",
  contador: "0",
  contadorTexto: "datos tuyos han llegado a la IA",
  pasos: [
    {
      titulo: "Escribes tu pregunta",
      texto: "Con tus datos, en tu dispositivo.",
      d: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0",
    },
    {
      titulo: "Se ocultan antes de salir",
      texto:
        "El enmascarado busca DNI, IBAN, tarjetas, correos y teléfonos, y los cambia por marcadores.",
      d: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5",
    },
    {
      titulo: "La IA solo ve marcadores",
      texto: "Sabe que hay un dato, no cuál es. El proxy no guarda el contenido.",
      d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    },
    {
      titulo: "Recibes pasos con su fuente",
      texto: "Cada cifra debe aparecer en la fuente citada.",
      d: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 14l2 2 4-4",
    },
    {
      titulo: "Borrar todo cuando quieras",
      texto: "Tus datos son tuyos y se eliminan con un botón.",
      d: "M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13",
    },
  ] as const,
};

export const instalacion = {
  titulo: "Ponla en tu pantalla de inicio",
  subtitulo: "Se abre más rápido y funciona sin conexión.",
  androidTitulo: "En Android o en el ordenador",
  android: [
    "Abre el menú del navegador.",
    "Pulsa «Instalar app» o «Añadir a la pantalla de inicio».",
    "Ábrela desde su icono.",
  ],
  iphoneTitulo: "En iPhone",
  iphone: [
    "Pulsa el botón Compartir.",
    "Elige «Añadir a pantalla de inicio».",
    "Ábrela desde su icono.",
  ],
};
