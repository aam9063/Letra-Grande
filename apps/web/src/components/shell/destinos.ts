/**
 * Los ocho destinos de la navegación (sección 14 de docs/ARRANQUE.md).
 * Única fuente de verdad para la navegación y para las rutas de la Ola 2.
 */
export interface Destino {
  readonly href: string;
  readonly nombre: string;
}

export const destinos: readonly Destino[] = [
  { href: "/hoy", nombre: "Hoy" },
  { href: "/asistente", nombre: "Asistente" },
  { href: "/carpeta", nombre: "Carpeta" },
  { href: "/reclamar", nombre: "Reclamar y bajas" },
  { href: "/vida", nombre: "Vida" },
  { href: "/ayudas", nombre: "Ayudas" },
  { href: "/datos", nombre: "Datos" },
  { href: "/familia", nombre: "Familia" },
];
