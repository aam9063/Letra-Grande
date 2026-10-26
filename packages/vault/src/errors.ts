/**
 * Errores tipados del vault. Los mensajes nunca incluyen datos ni claves.
 * Viven en un módulo propio para que backup.ts y vault.ts puedan compartirlos
 * sin dependencias circulares.
 */

/** Error base del vault. */
export class VaultError extends Error {}

/** La contraseña no descifra el verificador: no se ha tocado ningún dato. */
export class WrongPasswordError extends VaultError {
  constructor() {
    super("La contraseña no es correcta.");
  }
}

/** La sesión está cerrada: hace falta la contraseña otra vez. */
export class VaultLockedError extends VaultError {
  constructor() {
    super("El vault está bloqueado: introduce la contraseña otra vez.");
  }
}

/** GCM ha detectado manipulación o corrupción en un registro. */
export class VaultCorruptError extends VaultError {
  constructor() {
    super("Un registro no se ha podido descifrar: los datos están dañados.");
  }
}

/** Los metadatos del vault están incompletos o dañados. */
export class VaultCorruptMetaError extends VaultError {
  constructor() {
    super("Los metadatos del vault están dañados: no se puede abrir de forma fiable.");
  }
}

/** El registro usa una versión del formato que esta versión no entiende. */
export class VaultRecordVersionError extends VaultError {
  constructor() {
    super("Un registro usa una versión del formato cifrado no compatible.");
  }
}

/** Los parámetros de derivación guardados no son compatibles con esta versión. */
export class VaultUnsupportedKdfError extends VaultError {
  constructor() {
    super("Los parámetros de derivación guardados no son compatibles con esta versión.");
  }
}

/** El archivo de copia está dañado, truncado o no es una copia de Letra Grande. */
export class VaultCorruptExportError extends VaultError {
  constructor() {
    super("El archivo de copia está dañado o no es una copia válida.");
  }
}

/** La copia usa una versión del formato de exportación no compatible. */
export class VaultUnsupportedExportError extends VaultError {
  constructor() {
    super("La copia usa una versión del formato no compatible con esta versión.");
  }
}

/** El almacén actual ya tiene contenido: la importación exige confirmación. */
export class VaultNotEmptyError extends VaultError {
  constructor() {
    super("El almacén actual ya tiene contenido: confirma el reemplazo para importar la copia.");
  }
}
