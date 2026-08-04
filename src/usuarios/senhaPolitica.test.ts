import { test } from "node:test";
import assert from "node:assert/strict";
import { senhaValida, validarSenha } from "./senhaPolitica";

test("senha que atende tudo passa sem motivos", () => {
  assert.deepEqual(validarSenha("Senha123!"), []);
  assert.equal(senhaValida("Senha123!"), true);
});

test("acusa cada requisito faltando, um por vez", () => {
  assert.match(validarSenha("Ab1!").join(), /8 caracteres/);
  assert.match(validarSenha("senha123!").join(), /maiúscula/);
  assert.match(validarSenha("Senhasenha!").join(), /número/);
  assert.match(validarSenha("Senha1234").join(), /símbolo/);
});

test("senha vazia acusa todos os requisitos", () => {
  assert.equal(validarSenha("").length, 4);
});

test("espaco nao conta como simbolo", () => {
  // Sem isso, "Senha 1234" passaria so por causa do espaco - fraca do mesmo
  // jeito, so que parecendo forte.
  assert.match(validarSenha("Senha 1234").join(), /símbolo/);
});
