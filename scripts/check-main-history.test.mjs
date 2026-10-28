import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluarHistoria } from "./check-main-history.mjs";

const SCRIPT = fileURLToPath(new URL("./check-main-history.mjs", import.meta.url));

test("un PR que no va a main no se comprueba", () => {
  const resultado = evaluarHistoria({ base: "dev", head: "lg/algo", esAncestro: false });

  assert.equal(resultado.ok, true);
  assert.match(resultado.mensaje, /el PR va a dev/);
});

test("un push, que no es un pull request, no se comprueba", () => {
  const resultado = evaluarHistoria({ base: "", esAncestro: false });

  assert.equal(resultado.ok, true);
  assert.match(resultado.mensaje, /no es un pull request/);
});

test("una rama que lleva toda la historia de main se acepta", () => {
  const resultado = evaluarHistoria({ base: "main", head: "dev", esAncestro: true });

  assert.equal(resultado.ok, true);
  assert.match(resultado.mensaje, /toda la historia de main/);
});

test("una rama a la que le falta historia de main se rechaza con los commits y el arreglo", () => {
  const resultado = evaluarHistoria({
    base: "main",
    head: "dev",
    esAncestro: false,
    commitsSoloEnBase: ["e4d96b6 Dev (#35)", "d8793e0 fix(web): module pages fill (#28)"],
  });

  assert.equal(resultado.ok, false);
  assert.match(resultado.mensaje, /2 commit/);
  assert.match(resultado.mensaje, /e4d96b6 Dev \(#35\)/);
  assert.match(resultado.mensaje, /conflictos fantasma/);
  assert.match(resultado.mensaje, /git merge origin\/main/);
  assert.match(resultado.mensaje, /git checkout dev -- \./);
  assert.match(resultado.mensaje, /nunca con squash/);
});

test("el arreglo nombra la rama de la entrega, no una fija", () => {
  const resultado = evaluarHistoria({
    base: "main",
    head: "lg/entrega-urgente",
    esAncestro: false,
    commitsSoloEnBase: ["abc123"],
  });

  assert.match(resultado.mensaje, /git checkout lg\/entrega-urgente -- \./);
  assert.doesNotMatch(resultado.mensaje, /git checkout dev/);
});

test("una divergencia larga no inunda el log: lista diez y cuenta el resto", () => {
  const commits = Array.from({ length: 25 }, (_, indice) => `commit-${indice + 1}`);

  const resultado = evaluarHistoria({
    base: "main",
    head: "dev",
    esAncestro: false,
    commitsSoloEnBase: commits,
    totalCommitsSoloEnBase: 25,
  });

  assert.match(resultado.mensaje, /25 commit/);
  assert.match(resultado.mensaje, /commit-10/);
  assert.doesNotMatch(resultado.mensaje, /commit-11/);
  assert.match(resultado.mensaje, /y 15 más/);
});

test("sin commits que listar, el rechazo sigue explicando el problema", () => {
  const resultado = evaluarHistoria({ base: "main", head: "dev", esAncestro: false });

  assert.equal(resultado.ok, false);
  assert.match(resultado.mensaje, /main tiene commits que esta rama no tiene/);
  assert.match(resultado.mensaje, /commit de fusión/);
});

/** Repo temporal con main y dev divergentes y origin/main apuntando a main. */
function repoDivergente() {
  const dir = mkdtempSync(join(tmpdir(), "lg-historia-"));
  const commit = (mensaje, archivo) => {
    writeFileSync(join(dir, archivo), `${archivo}\n`, "utf8");
    execFileSync("git", ["add", "-A"], { cwd: dir });
    execFileSync("git", ["commit", "-qm", mensaje], { cwd: dir });
  };

  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "pruebas@example.com"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Pruebas"], { cwd: dir });
  commit("base", "base.txt");
  execFileSync("git", ["checkout", "-qb", "dev"], { cwd: dir });
  commit("en dev", "dev.txt");
  execFileSync("git", ["checkout", "-q", "main"], { cwd: dir });
  commit("en main", "main.txt");
  execFileSync("git", ["checkout", "-q", "dev"], { cwd: dir });
  execFileSync("git", ["update-ref", "refs/remotes/origin/main", "main"], { cwd: dir });

  return dir;
}

function ejecutar(dir, entorno) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, ...entorno },
  });
}

test("como programa, una divergencia sale con código 1 y el arreglo en stderr", () => {
  const dir = repoDivergente();
  try {
    const salida = ejecutar(dir, { GITHUB_BASE_REF: "main", GITHUB_HEAD_REF: "dev" });

    assert.equal(salida.status, 1);
    assert.match(salida.stderr, /Historia no apta para entregar a main/);
    assert.match(salida.stderr, /commit de fusión, no squash/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("como programa, cuando la rama lleva la historia de main sale con 0", () => {
  const dir = repoDivergente();
  try {
    // Con el commit de la rama apuntando a main, la historia está al día.
    const salida = ejecutar(dir, {
      GITHUB_BASE_REF: "main",
      GITHUB_HEAD_REF: "dev",
      GITHUB_HEAD_SHA: "main",
    });

    assert.equal(salida.status, 0);
    assert.match(salida.stdout, /toda la historia de main/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("como programa, un PR a dev no mira la historia", () => {
  const dir = repoDivergente();
  try {
    const salida = ejecutar(dir, { GITHUB_BASE_REF: "dev", GITHUB_HEAD_REF: "lg/algo" });

    assert.equal(salida.status, 0);
    assert.match(salida.stdout, /No aplica/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
