import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { tentarTravar } from "./travaPassada";

function arquivoTemporario(): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "trava-")), "passada.lock");
}

test("so uma passada pega a trava por vez", () => {
  const arquivo = arquivoTemporario();
  const liberar = tentarTravar(arquivo);
  assert.ok(liberar);
  assert.equal(tentarTravar(arquivo), null);

  liberar();
  const deNovo = tentarTravar(arquivo);
  assert.ok(deNovo);
  deNovo();
});

test("trava esquecida por processo morto expira", () => {
  const arquivo = arquivoTemporario();
  assert.ok(tentarTravar(arquivo));
  // 11 minutos depois, a trava velha nao impede a proxima passada.
  const liberar = tentarTravar(arquivo, Date.now() + 11 * 60 * 1000);
  assert.ok(liberar);
  liberar();
  assert.equal(fs.existsSync(arquivo), false);
});
