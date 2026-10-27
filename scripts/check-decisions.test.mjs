import { test } from "node:test";
import assert from "node:assert/strict";
import { citedDecisions, decisionIds, missingDecisions } from "./check-decisions.mjs";

const TABLA = ["| D-06 | Cuenta |", "| D-11 | Escritorio |", "| D-12 | Releases |", "| D-13 | OCR |"].join("\n");

test("lee los ids de la tabla y no los de otras tablas", () => {
  const ids = decisionIds(`${TABLA}\n| MOD-12 | Familia |\n| H-10 | Ramas |`);
  assert.deepEqual([...ids].sort(), ["D-06", "D-11", "D-12", "D-13"]);
});

test("una cita valida se reconoce", () => {
  assert.deepEqual([...citedDecisions("ver D-13 y (D-12)")].sort(), ["D-12", "D-13"]);
});

test("MOD-12 no cuenta como cita de D-12", () => {
  assert.deepEqual([...citedDecisions("la tarea MOD-12 y REF-UI-09")], []);
});

test("una cita inexistente se detecta", () => {
  const faltan = missingDecisions(decisionIds(TABLA), citedDecisions("segun D-14"));
  assert.deepEqual(faltan, ["D-14"]);
});

test("todas las citas existentes no producen problemas", () => {
  const faltan = missingDecisions(decisionIds(TABLA), citedDecisions("D-06, D-11, D-12 y D-13"));
  assert.deepEqual(faltan, []);
});
