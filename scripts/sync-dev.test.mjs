import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PREFIJO_RAMA,
  cuerpoDePr,
  decidirSincronizacion,
  nombreDeRama,
  necesitaSincronizacion,
} from "./sync-dev.mjs";

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

test("sin commits de main que traer, la decisión es no hacer nada", () => {
  const decision = decidirSincronizacion({ mainEsAncestroDeDev: true });

  assert.equal(decision.accion, "nada");
  assert.match(decision.mensaje, /nada que sincronizar/);
});

test("con conflictos se aborta y no se fuerza el árbol de dev", () => {
  const decision = decidirSincronizacion({
    mainEsAncestroDeDev: false,
    huboConflictos: true,
    arbolIdentico: false,
  });

  assert.equal(decision.accion, "abortar");
  assert.match(decision.mensaje, /conflictos/);
  assert.match(decision.mensaje, /alguien tiene que mirar/);
});

test("si el árbol no es idéntico al de dev, se aborta aunque no haya conflictos", () => {
  const decision = decidirSincronizacion({
    mainEsAncestroDeDev: false,
    huboConflictos: false,
    arbolIdentico: false,
  });

  assert.equal(decision.accion, "abortar");
  assert.match(decision.mensaje, /no es idéntico/);
  assert.match(decision.mensaje, /No se abre ningún PR/);
});

test("solo se sincroniza con el árbol idéntico y sin conflictos", () => {
  const decision = decidirSincronizacion({
    mainEsAncestroDeDev: false,
    huboConflictos: false,
    arbolIdentico: true,
  });

  assert.equal(decision.accion, "sincronizar");
});

test("abortar gana a sincronizar si llegan las dos señales raras a la vez", () => {
  const decision = decidirSincronizacion({
    mainEsAncestroDeDev: false,
    huboConflictos: true,
    arbolIdentico: true,
  });

  assert.equal(decision.accion, "abortar");
});
