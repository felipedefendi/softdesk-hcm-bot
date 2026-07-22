import { test } from "node:test";
import assert from "node:assert/strict";
import { resumirErro } from "./erros";

test("resumirErro corta o call log do Playwright, que carrega o cookie de sessao", () => {
  const erroReal = new Error(
    [
      "apiRequestContext.get: socket hang up",
      "Call log:",
      "  - → GET https://js.soft4.com.br/chamado/json?cd_pasta=8",
      "    - cookie: PHPSESSID=segredo; laravel_session=outrosegredo",
    ].join("\n")
  );

  const resumo = resumirErro(erroReal);

  assert.equal(resumo, "apiRequestContext.get: socket hang up");
  assert.ok(!resumo.includes("PHPSESSID"), "o resumo nao pode conter cookie");
  assert.ok(!resumo.includes("laravel_session"), "o resumo nao pode conter sessao");
});

test("resumirErro aceita valor que nao e Error", () => {
  assert.equal(resumirErro("falhou feio"), "falhou feio");
  assert.equal(resumirErro(404), "404");
});
