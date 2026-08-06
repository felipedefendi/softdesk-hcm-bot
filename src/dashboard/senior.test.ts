import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { autenticarNaSenior } from "./senior";

const fetchReal = global.fetch;

function mockFetch(resposta: Response | (() => never)): void {
  global.fetch = (async () => (typeof resposta === "function" ? resposta() : resposta)) as typeof fetch;
}

afterEach(() => {
  global.fetch = fetchReal;
});

test("devolve o username do jsonToken quando a Senior responde 200", async () => {
  const jsonToken = JSON.stringify({ username: "ana.silva@x.com", access_token: "abc", refresh_token: "def" });
  mockFetch(new Response(JSON.stringify({ jsonToken }), { status: 200 }));

  const r = await autenticarNaSenior("ana.silva@x.com", "senha");
  assert.deepEqual(r, { ok: true, username: "ana.silva@x.com" });
});

test("erro generico de credencial no 401", async () => {
  mockFetch(new Response("", { status: 401 }));

  const r = await autenticarNaSenior("ana.silva@x.com", "errada");
  assert.equal(r.ok, false);
  assert.match((r as { erro: string }).erro, /senha/i);
});

test("avisa sobre MFA quando a resposta traz mfaInfo em vez de jsonToken", async () => {
  mockFetch(new Response(JSON.stringify({ mfaInfo: { temporaryToken: "tmp" } }), { status: 200 }));

  const r = await autenticarNaSenior("ana.silva@x.com", "senha");
  assert.equal(r.ok, false);
  assert.match((r as { erro: string }).erro, /MFA|duas etapas/i);
});

test("erro de indisponibilidade quando o fetch lanca (rede fora)", async () => {
  mockFetch(() => {
    throw new Error("network down");
  });

  const r = await autenticarNaSenior("ana.silva@x.com", "senha");
  assert.equal(r.ok, false);
  assert.match((r as { erro: string }).erro, /indispon/i);
});
