import { test } from "node:test";
import assert from "node:assert/strict";
import { cifrar, decifrar, gerarChave } from "./cripto";

const CHAVE = gerarChave();

test("cifra e decifra o mesmo texto", () => {
  const original = "senha-super-secreta-123";
  const campo = cifrar(original, CHAVE);
  assert.equal(decifrar(campo, CHAVE), original);
});

test("cada cifragem usa um IV diferente, mesmo com o mesmo texto e chave", () => {
  // Critico para GCM: reusar IV com a mesma chave quebra a ciframgem.
  const a = cifrar("mesma-senha", CHAVE);
  const b = cifrar("mesma-senha", CHAVE);
  assert.notEqual(a.iv, b.iv);
  assert.notEqual(a.texto, b.texto);
});

test("adulterar o texto cifrado faz a decifragem falhar", () => {
  const campo = cifrar("senha-original", CHAVE);
  const outro = cifrar("outra-coisa-qualquer", CHAVE);
  assert.throws(() => decifrar({ ...campo, texto: outro.texto }, CHAVE));
});

test("adulterar o authTag faz a decifragem falhar", () => {
  const campo = cifrar("senha-original", CHAVE);
  const authTagAdulterado = Buffer.from(campo.authTag, "base64");
  authTagAdulterado[0] ^= 0xff;
  assert.throws(() => decifrar({ ...campo, authTag: authTagAdulterado.toString("base64") }, CHAVE));
});

test("decifrar com a chave errada falha", () => {
  const campo = cifrar("senha-original", CHAVE);
  assert.throws(() => decifrar(campo, gerarChave()));
});

test("chave com tamanho errado e rejeitada", () => {
  const chaveCurta = Buffer.from("chave-muito-curta").toString("base64");
  assert.throws(() => cifrar("texto", chaveCurta));
});

test("gerarChave produz 32 bytes (256 bits)", () => {
  const chave = gerarChave();
  assert.equal(Buffer.from(chave, "base64").length, 32);
});

test("gerarChave nao repete valores", () => {
  assert.notEqual(gerarChave(), gerarChave());
});
