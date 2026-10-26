import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkReviewReport } from "./check-review-report.mjs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const VALID_REPORT = [
  "---",
  "tarea: TEST-99",
  "base: aaa1111",
  "revisado: bbb2222",
  "revisor: revisor-de-prueba",
  "veredicto: aprobado con cambios",
  "---",
  "",
  "## Resumen",
  "",
  "Sin incidencias.",
  "",
  "## Hallazgos",
  "",
  "Ninguno.",
  "",
  "## Qué se aplicó en la ronda de correcciones",
  "",
  "Nada: no hubo hallazgos.",
  "",
].join("\n");

function withReviewsDir(files) {
  const dir = mkdtempSync(join(tmpdir(), "lg-review-report-"));
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content, "utf8");
  }
  return dir;
}

test("titulo sin id de tarea: la comprobacion no aplica y no falla", () => {
  const result = checkReviewReport({ title: "Mejorar la portada", reviewsDir: join(tmpdir(), "no-existe") });
  assert.equal(result.status, "skip");
  assert.match(result.message, /no aplica/i);
});

test("titulo con id y sin informe: falla nombrando la ruta exacta que falta", () => {
  const result = checkReviewReport({ title: "TEST-99: algo", reviewsDir: join(tmpdir(), "no-existe") });
  assert.equal(result.status, "fail");
  assert.match(result.message, /odd\/reviews\/test-99\.md/);
  assert.match(result.message, /_template\.md/);
});

test("titulo con id e informe completo: pasa", () => {
  const dir = withReviewsDir({ "test-99.md": VALID_REPORT });
  try {
    const result = checkReviewReport({ title: "TEST-99: algo", reviewsDir: dir });
    assert.equal(result.status, "pass");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("informe sin front matter: falla nombrando las claves que faltan", () => {
  const dir = withReviewsDir({ "test-99.md": "# Informe\n\nSin front matter.\n" });
  try {
    const result = checkReviewReport({ title: "TEST-99: algo", reviewsDir: dir });
    assert.equal(result.status, "fail");
    for (const key of ["tarea", "base", "revisado", "revisor", "veredicto"]) {
      assert.match(result.message, new RegExp(key));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("informe con titulo antes del front matter: pasa, como ops-01.md", () => {
  const report = ["# Review gate TEST-99: algo", "", VALID_REPORT].join("\n");
  const dir = withReviewsDir({ "test-99.md": report });
  try {
    const result = checkReviewReport({ title: "TEST-99: algo", reviewsDir: dir });
    assert.equal(result.status, "pass");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("titulo con id en minusculas y sin informe: falla, no se salta la comprobacion", () => {
  const result = checkReviewReport({ title: "ops-05: algo", reviewsDir: join(tmpdir(), "no-existe") });
  assert.equal(result.status, "fail");
  assert.match(result.message, /odd\/reviews\/ops-05\.md/);
});

test("ids CORE-01 y core-01 resuelven al mismo informe", () => {
  const dir = withReviewsDir({ "core-01.md": VALID_REPORT.replace("TEST-99", "CORE-01") });
  try {
    assert.equal(checkReviewReport({ title: "CORE-01: algo", reviewsDir: dir }).status, "pass");
    assert.equal(checkReviewReport({ title: "core-01: algo", reviewsDir: dir }).status, "pass");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("id en mayusculas y minusculas dentro de un titulo largo funciona", () => {
  const dir = withReviewsDir({ "core-01.md": VALID_REPORT.replace("TEST-99", "CORE-01") });
  try {
    const result = checkReviewReport({ title: "fix(ui): CoRe-01 ayuda en la portada", reviewsDir: dir });
    assert.equal(result.status, "pass");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("veredicto rechazado: falla porque no se puede fusionar", () => {
  const report = VALID_REPORT.replace("veredicto: aprobado con cambios", "veredicto: rechazado");
  const dir = withReviewsDir({ "test-99.md": report });
  try {
    const result = checkReviewReport({ title: "TEST-99: algo", reviewsDir: dir });
    assert.equal(result.status, "fail");
    assert.match(result.message, /rechazada/i);
    assert.match(result.message, /fusionar/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("entrada CLI: titulo con id y sin informe sale con codigo 1 y nombra el archivo", () => {
  const script = fileURLToPath(new URL("./check-review-report.mjs", import.meta.url));
  assert.throws(
    () => execFileSync(process.execPath, [script, "TEST-77: tarea de prueba sin informe"], { encoding: "utf8", stdio: "pipe" }),
    (error) => {
      assert.equal(error.status, 1);
      assert.match(error.stderr, /odd\/reviews\/test-77\.md/);
      return true;
    },
  );
});

test("entrada CLI: titulo sin id de tarea sale con codigo 0", () => {
  const script = fileURLToPath(new URL("./check-review-report.mjs", import.meta.url));
  const stdout = execFileSync(process.execPath, [script, "Mejorar la portada"], { encoding: "utf8", stdio: "pipe" });
  assert.match(stdout, /no aplica/i);
});

test("informe con veredicto valido: pasa con aprobado y aprobado con cambios", () => {
  for (const verdict of ["aprobado", "aprobado con cambios"]) {
    const report = VALID_REPORT.replace("veredicto: aprobado con cambios", `veredicto: ${verdict}`);
    const dir = withReviewsDir({ "test-99.md": report });
    try {
      const result = checkReviewReport({ title: "TEST-99: algo", reviewsDir: dir });
      assert.equal(result.status, "pass");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("una tarea con letra final acepta el informe con el id base", () => {
  const dir = withReviewsDir({ "ai-03.md": VALID_REPORT.replace("TEST-99", "AI-03") });
  try {
    const result = checkReviewReport({ title: "AI-03a: recuperacion bm25", reviewsDir: dir });
    assert.equal(result.status, "pass");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("una tarea con letra final acepta el informe con el id completo", () => {
  const dir = withReviewsDir({ "ai-03a.md": VALID_REPORT.replace("TEST-99", "AI-03a") });
  try {
    const result = checkReviewReport({ title: "AI-03a: recuperacion bm25", reviewsDir: dir });
    assert.equal(result.status, "pass");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("un informe de otra tarea falla y dice de quien es y quien lo reclama", () => {
  const dir = withReviewsDir({ "ai-03.md": VALID_REPORT.replace("TEST-99", "OPS-04") });
  try {
    const result = checkReviewReport({ title: "AI-03a: recuperacion bm25", reviewsDir: dir });
    assert.equal(result.status, "fail");
    assert.match(result.message, /OPS-04/);
    assert.match(result.message, /ai-03a/i);
    assert.match(result.message, /pertenece a la tarea/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("con ambos informes gana el del id completo: ai-03a aprobado, ai-03 rechazado", () => {
  const dir = withReviewsDir({
    "ai-03a.md": VALID_REPORT.replace("TEST-99", "AI-03a"),
    "ai-03.md": VALID_REPORT.replace("TEST-99", "AI-03").replace("veredicto: aprobado con cambios", "veredicto: rechazado"),
  });
  try {
    const result = checkReviewReport({ title: "AI-03a: recuperacion bm25", reviewsDir: dir });
    assert.equal(result.status, "pass");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sin ninguno de los dos nombres falla y nombra ambos", () => {
  const dir = withReviewsDir({ "otra.md": VALID_REPORT });
  try {
    const result = checkReviewReport({ title: "AI-03a: recuperacion bm25", reviewsDir: dir });
    assert.equal(result.status, "fail");
    assert.match(result.message, /ai-03a\.md/);
    assert.match(result.message, /ai-03\.md/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
