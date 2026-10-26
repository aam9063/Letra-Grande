// Validaciones de patrones: letra de DNI/NIE, IBAN módulo 97 y Luhn (sección 9).

/** Serie oficial de letras del DNI. */
const LETRAS_DNI = "TRWAGMYFPDXBNJZSQVHLCKE";

/** Valor numérico que aporta la letra inicial de un NIE: X=0, Y=1, Z=2. */
function valorNie(letra: string): number {
  switch (letra) {
    case "X":
      return 0;
    case "Y":
      return 1;
    default:
      return 2;
  }
}

/** Letra esperada para un número de DNI/NIE según la serie oficial. */
export function letraDni(numero: number): string {
  return LETRAS_DNI.charAt(numero % 23);
}

/**
 * Comprueba la letra de un DNI o NIE ya normalizado
 * (mayúsculas, sin espacios ni guiones).
 */
export function esDocumentoValido(valor: string): boolean {
  const m = /^(?:([XYZ]))?(\d{7,8})([A-Z])$/.exec(valor);
  if (!m) return false;
  const prefijo = m[1];
  const numero = Number(m[2]) + (prefijo !== undefined ? valorNie(prefijo) * 10_000_000 : 0);
  return letraDni(numero) === m[3];
}

/** Comprueba un IBAN español moviendo los 4 primeros caracteres al final y aplicando módulo 97. */
export function esIbanValido(valor: string): boolean {
  const compacto = valor.replace(/\s/g, "").toUpperCase();
  if (!/^ES\d{22}$/.test(compacto)) return false;
  const reordenado = compacto.slice(4) + compacto.slice(0, 4);
  let resto = 0;
  for (const caracter of reordenado) {
    const digitoOCodigo = caracter >= "A" ? String(caracter.charCodeAt(0) - 55) : caracter;
    for (const digito of digitoOCodigo) {
      resto = (resto * 10 + Number(digito)) % 97;
    }
  }
  return resto === 1;
}

/** Algoritmo de Luhn sobre una cadena de dígitos. */
export function pasaLuhn(digitos: string): boolean {
  let suma = 0;
  let doble = false;
  for (let i = digitos.length - 1; i >= 0; i--) {
    let cifra = Number(digitos[i]);
    if (doble) {
      cifra *= 2;
      if (cifra > 9) cifra -= 9;
    }
    suma += cifra;
    doble = !doble;
  }
  return suma % 10 === 0;
}
