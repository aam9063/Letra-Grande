"use client";

import { useEffect, useState } from "react";
import { openVault, type Vault, type VaultTimer } from "@letra-grande/vault";

/**
 * Sesión compartida de la carpeta (UI-07, S4): un módulo con suscriptores que
 * recuerda el vault abierto y su estado (no creada, cerrada o abierta). La
 * clave derivada vive solo dentro del Vault, en memoria: aquí lo único que se
 * persiste es la bandera de que existe una carpeta en este dispositivo, sin
 * claves ni datos personales.
 */

export type EstadoCarpeta = "no-creada" | "cerrada" | "abierta";

/** Bandera local en localStorage: solo dice si existe una carpeta. */
export const CLAVE_EXISTE = "lg-carpeta-existe";

export interface OpcionesSesion {
  /** Abre (o crea) el vault. Inyectable para los tests. */
  abrirVault?: typeof openVault;
  /** Almacenamiento de la bandera. Por defecto, localStorage. */
  almacen?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  dbName?: string;
  indexedDB?: IDBFactory;
  iterations?: number;
  inactivityMs?: number;
  timer?: VaultTimer;
}

export interface SesionCarpeta {
  consultar(): EstadoCarpeta;
  obtenerVault(): Vault | null;
  /** Crea la carpeta con esta contraseña (o abre si ya existía). */
  crear(password: string): Promise<Vault>;
  /** Desbloquea la carpeta existente con su contraseña. */
  desbloquear(password: string): Promise<Vault>;
  /** Cierra la sesión: la clave se descarta y hace falta la contraseña otra vez. */
  bloquear(): void;
  suscribirse(oyente: (estado: EstadoCarpeta) => void): () => void;
}

export function crearSesionCarpeta(opciones: OpcionesSesion = {}): SesionCarpeta {
  const abrir = opciones.abrirVault ?? openVault;
  let vault: Vault | null = null;
  const oyentes = new Set<(estado: EstadoCarpeta) => void>();

  function almacen(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | undefined {
    if (opciones.almacen !== undefined) {
      return opciones.almacen;
    }
    return typeof localStorage === "undefined" ? undefined : localStorage;
  }

  function existe(): boolean {
    return almacen()?.getItem(CLAVE_EXISTE) === "1";
  }

  function marcarExiste(): void {
    almacen()?.setItem(CLAVE_EXISTE, "1");
  }

  function estado(): EstadoCarpeta {
    if (vault !== null) {
      return "abierta";
    }
    return existe() ? "cerrada" : "no-creada";
  }

  function notificar(): void {
    const actual = estado();
    for (const oyente of oyentes) {
      oyente(actual);
    }
  }

  // El bloqueo por inactividad del vault también cierra la sesión compartida.
  function alBloqueoAutomatico(): void {
    if (vault !== null && vault.locked) {
      vault = null;
      notificar();
    }
  }

  async function abrirSesion(password: string): Promise<Vault> {
    const abierta = await abrir({
      password,
      dbName: opciones.dbName,
      indexedDB: opciones.indexedDB,
      iterations: opciones.iterations,
      inactivityMs: opciones.inactivityMs,
      timer: opciones.timer,
      onLock: alBloqueoAutomatico,
    });
    vault = abierta;
    marcarExiste();
    notificar();
    return abierta;
  }

  return {
    consultar: estado,
    obtenerVault: () => vault,
    crear: abrirSesion,
    desbloquear: abrirSesion,
    bloquear(): void {
      vault?.lock();
      vault = null;
      notificar();
    },
    suscribirse(oyente) {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
  };
}

/** Sesión compartida de toda la app. */
export const sesionCarpeta = crearSesionCarpeta();

/** Estado de la carpeta para la interfaz: se actualiza con la sesión. */
export function useSesionCarpeta(): EstadoCarpeta {
  const [estado, setEstado] = useState<EstadoCarpeta>("no-creada");

  useEffect(() => {
    setEstado(sesionCarpeta.consultar());
    return sesionCarpeta.suscribirse(setEstado);
  }, []);

  return estado;
}
