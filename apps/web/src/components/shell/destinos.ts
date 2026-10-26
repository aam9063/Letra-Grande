/**
 * Destinos de la navegación (sección 14 de docs/ARRANQUE.md). Única fuente de
 * verdad para la navegación y para las rutas de la Ola 2.
 *
 * Shell responsive (UI-04): los cuatro destinos principales van en la barra
 * móvil y en la nav de la sidebar de escritorio; los cuatro restantes se
 * abren desde la hoja «Más» de la barra y desde el grupo «Más módulos» de la
 * sidebar (Escritorio.dc.html).
 */
export interface Destino {
  readonly href: string;
  readonly nombre: string;
}

/** Cuatro destinos fijos de la barra móvil y de la nav principal. */
export const destinosPrincipales: readonly Destino[] = [
  { href: "/hoy", nombre: "Hoy" },
  { href: "/asistente", nombre: "Asistente" },
  { href: "/carpeta", nombre: "Carpeta" },
  { href: "/reclamar", nombre: "Reclamar y bajas" },
];

/** Módulos que se abren desde la hoja «Más» de la barra móvil. */
export const destinosExtra: readonly Destino[] = [
  { href: "/vida", nombre: "Cambios de vida" },
  { href: "/ayudas", nombre: "Ayudas" },
  { href: "/datos", nombre: "Datos abiertos" },
  { href: "/familia", nombre: "Familia" },
];

/** Los ocho destinos completos: principales seguidos de los extra. */
export const destinos: readonly Destino[] = [...destinosPrincipales, ...destinosExtra];

/**
 * Grupo «Más módulos» de la sidebar de escritorio (Escritorio.dc.html). Los
 * módulos sin ruta real se muestran deshabilitados con «Próximamente»: nunca
 * como enlaces que no llevan a ninguna parte.
 */
export interface ModuloSidebar {
  readonly nombre: string;
  /** Ruta real, si el módulo existe todavía. */
  readonly href?: string;
  /** Sin ruta real todavía: entrada informativa, no enlace. */
  readonly pendiente?: true;
}

export const modulosSidebar: readonly ModuloSidebar[] = [
  { nombre: "Factura de luz", pendiente: true },
  { nombre: "Cambios de vida", href: "/vida" },
  { nombre: "Ayudas", href: "/ayudas" },
  { nombre: "Suscripciones", pendiente: true },
  { nombre: "Datos abiertos", href: "/datos" },
  { nombre: "Familia", href: "/familia" },
];
