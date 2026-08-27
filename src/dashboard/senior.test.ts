import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import type tls from "node:tls";
import { autenticarNaSenior } from "./senior";
import { CONTORNO_ATE, contornoEstaAtivo, erroEhCertificadoExpirado, validarCertificadoTemporario } from "./seniorTlsTemporario";

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

test("usa o POST temporario apenas quando a causa e CERT_HAS_EXPIRED", async () => {
  mockFetch(() => {
    const causa = Object.assign(new Error("certificate has expired"), { code: "CERT_HAS_EXPIRED" });
    throw Object.assign(new TypeError("fetch failed"), { cause: causa });
  });
  let chamou = false;

  const r = await autenticarNaSenior("ana.silva@x.com", "errada", {
    agora: () => Date.parse("2026-08-27T12:00:00Z"),
    postarTemporario: async () => {
      chamou = true;
      return new Response("", { status: 401 });
    },
  });

  assert.equal(chamou, true);
  assert.equal(r.ok, false);
  assert.match((r as { erro: string }).erro, /senha/i);
});

test("nao usa o contorno depois do prazo automatico", async () => {
  mockFetch(() => {
    const causa = Object.assign(new Error("certificate has expired"), { code: "CERT_HAS_EXPIRED" });
    throw Object.assign(new TypeError("fetch failed"), { cause: causa });
  });
  let chamou = false;

  const r = await autenticarNaSenior("ana.silva@x.com", "senha", {
    agora: () => CONTORNO_ATE + 1,
    postarTemporario: async () => {
      chamou = true;
      return new Response("", { status: 200 });
    },
  });

  assert.equal(chamou, false);
  assert.equal(r.ok, false);
  assert.match((r as { erro: string }).erro, /indispon/i);
});

test("reconhece o erro de certificado tanto direto quanto dentro de cause", () => {
  assert.equal(erroEhCertificadoExpirado({ code: "CERT_HAS_EXPIRED" }), true);
  assert.equal(erroEhCertificadoExpirado({ cause: { code: "CERT_HAS_EXPIRED" } }), true);
  assert.equal(erroEhCertificadoExpirado({ cause: { code: "ECONNREFUSED" } }), false);
});

test("pinagem aceita somente host, erro e fingerprint verificados", () => {
  const certificado = {
    subjectaltname: "DNS:api.senior.com.br",
    fingerprint256: "5F:CB:DD:F7:56:47:2F:B9:41:BA:52:0C:96:DA:85:B1:51:AF:E9:0D:69:BE:15:16:FB:A9:E8:C1:07:9C:66:D0",
  } as tls.PeerCertificate;
  const durante = Date.parse("2026-08-27T12:00:00Z");

  assert.equal(validarCertificadoTemporario("api.senior.com.br", "CERT_HAS_EXPIRED", certificado, durante), null);
  assert.match(
    validarCertificadoTemporario("api.senior.com.br", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", certificado, durante)?.message ?? "",
    /erro TLS inesperado/
  );
  assert.match(
    validarCertificadoTemporario("outro.exemplo", "CERT_HAS_EXPIRED", certificado, durante)?.message ?? "",
    /host diferente/
  );
  assert.match(
    validarCertificadoTemporario(
      "api.senior.com.br",
      "CERT_HAS_EXPIRED",
      { ...certificado, fingerprint256: "00:11" } as tls.PeerCertificate,
      durante
    )?.message ?? "",
    /fingerprint/
  );
  assert.equal(contornoEstaAtivo(CONTORNO_ATE), true);
  assert.equal(contornoEstaAtivo(CONTORNO_ATE + 1), false);
});
