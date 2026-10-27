# Review gate DESK-03c: icono del ejecutable y del instalador

---
tarea: DESK-03c
base: bd9b4fa
revisado: d7703b0
revisor: jd-judge-b (contexto limpio, solo lectura, icono extraído del binario)
veredicto: aprobado
---

## Resumen

El PNG es válido: cabecera IHDR correcta, 512 por 512, ocho bits, RGB, 9,2 KB, y coincide con el SVG de la PWA (mismo verde azulado, esquinas redondeadas, monograma blanco). La ruta `build/icon.png` se resuelve desde el directorio de recursos del paquete, el archivo está versionado y no lo excluye `.gitignore`, así que sobrevive a un checkout limpio. La comprobación fuerte es sobre el artefacto: el revisor extrajo el icono del ejecutable empaquetado en memoria y la esquina es exactamente `#3E9B94`, el verde de la marca, con centro blanco. El binario lleva el icono de la aplicación, no el de Electron. El comando de regeneración es reproducible con el Playwright que ya existe como dependencia de pruebas, sin prometer nada que el proyecto no tenga. El binario versionado deriva del SVG propio del proyecto: sin activos de terceros ni licencias ajenas. Sin dependencias nuevas, español correcto, sin rayas, sin secretos.

## Hallazgos

### 1. [nota] docs/desktop.md:127

Problema: el comando de regeneración usa una URL `file://` con un marcador de ruta que puede confundir en Windows.
Propuesta: aclarar que la ruta va con barras normales también en Windows. Aplicado.

### 2. [nota] odd/tasks/desk-03c-icon.md

Problema: la evidencia citaba un tamaño exacto del ejecutable que ya no coincidía con el artefacto en disco, porque el paquete se regeneró después.
Propuesta: no fijar el número. Aplicado: la evidencia habla de unos 7 KB más y añade la comprobación del icono extraído del binario.

## Code smells

La declaración explícita del icono es redundante porque el empaquetador lo busca por convención en `build/`, pero la claridad para quien lea la configuración compensa.

## Secretos

Ninguno.

## Qué se aplicó en la ronda de correcciones

Las dos notas de documentación. No hubo bloqueantes ni recomendados.
