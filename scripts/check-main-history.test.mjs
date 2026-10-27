import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluarHistoria } from "./check-main-history.mjs";

test("un PR que no va a main no se comprueba", () => {
  const resultado = evaluarHistoria({ base: "dev", esAncestro: false });

  assert.equal(resultado.ok, true);
  assert.match(resultado.mensaje, /No aplica/);
});

test("un push sin rama de destino no se comprueba", () => {
  const resultado = evaluarHistoria({ base: "", esAncestro: false });

  assert.equal(resultado.ok, true);
  assert.match(resultado.mensaje, /push/);
});

test("una rama que lleva toda la historia de main se acepta", () => {
  const resultado = evaluarHistoria({ base: "main", esAncestro: true });

  assert.equal(resultado.ok, true);
  assert.match(resultado.mensaje, /toda la historia de main/);
});

test("una rama a la que le falta historia de main se rechaza con los commits y el arreglo", () => {
  const resultado = evaluarHistoria({
    base: "main",
    esAncestro: false,
    commitsSoloEnBase: ["e4d96b6 Dev (#35)", "d8793e0 fix(web): module pages fill (#28)"],
  });

  assert.equal(resultado.ok, false);
  assert.match(resultado.mensaje, /2 commit/);
  assert.match(resultado.mensaje, /e4d96b6 Dev \(#35\)/);
  assert.match(resultado.mensaje, /conflictos fantasma/);
  assert.match(resultado.mensaje, /git merge origin\/main/);
  assert.match(resultado.mensaje, /nunca con squash/);
});

test("sin commits que listar, el rechazo sigue explicando el problema", () => {
  const resultado = evaluarHistoria({ base: "main", esAncestro: false });

  assert.equal(resultado.ok, false);
  assert.match(resultado.mensaje, /main tiene commits que esta rama no tiene/);
  assert.match(resultado.mensaje, /commit de fusión/);
});

test("el mensaje de rechazo no promete que el arreglo sea automático", () => {
  const resultado = evaluarHistoria({ base: "main", esAncestro: false, commitsSoloEnBase: ["abc123"] });

  assert.equal(resultado.ok, false);
  assert.match(resultado.mensaje, /si hay conflictos/);
});
