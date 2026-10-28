import { test } from "node:test";
import assert from "node:assert/strict";
import { PREFIJO_RAMA, cuerpoDePr, nombreDeRama, necesitaSincronizacion } from "./sync-dev.mjs";

test("no hay nada que sincronizar cuando main ya es ancestro de dev", () => {
  assert.equal(necesitaSincronizacion({ mainEsAncestroDeDev: true }), false);
});

test("hay que sincronizar cuando main tiene commits que dev no tiene", () => {
  assert.equal(necesitaSincronizacion({ mainEsAncestroDeDev: false }), true);
});

test("la rama lleva el prefijo reservado y los dos commits en corto", () => {
  const rama = nombreDeRama({
    mainSha: "1909304aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    devSha: "6f001fdbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  });

  assert.equal(rama, `${PREFIJO_RAMA}1909304-6f001fd`);
  assert.match(rama, /^sync\/dev-[0-9a-f]{7}-[0-9a-f]{7}$/);
});

test("dos ejecuciones con los mismos commits dan el mismo nombre de rama", () => {
  const datos = { mainSha: "abcdef1234567", devSha: "7654321fedcba" };

  assert.equal(nombreDeRama(datos), nombreDeRama(datos));
});

test("el cuerpo del PR lista los commits que se traen y declara que no cambia contenido", () => {
  const cuerpo = cuerpoDePr({
    commits: ["1909304 Merge pull request #56 from aam9063/dev", "8b94545 Merge pull request #49"],
    mainSha: "1909304aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    devSha: "6f001fdbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  });

  assert.match(cuerpo, /Nada de contenido/);
  assert.match(cuerpo, /1909304/);
  assert.match(cuerpo, /6f001fd/);
  assert.match(cuerpo, /- 1909304 Merge pull request #56 from aam9063\/dev/);
  assert.match(cuerpo, /- 8b94545 Merge pull request #49/);
  assert.match(cuerpo, /Risk: none/);
});

test("el cuerpo del PR sin commits no deja una lista vacía rara", () => {
  const cuerpo = cuerpoDePr({ commits: [], mainSha: "aaaaaaa", devSha: "bbbbbbb" });

  assert.match(cuerpo, /Commits que se traen:/);
  assert.doesNotMatch(cuerpo, /- \n/);
});
