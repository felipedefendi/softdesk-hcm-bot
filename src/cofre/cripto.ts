import crypto from "node:crypto";

/**
 * Cifragem simetrica (AES-256-GCM) para os campos sensiveis do cofre de
 * senhas de clientes. Funcoes puras - a chave e passada por parametro, quem
 * chama decide de onde ela vem (config.ts, em producao).
 *
 * Cada cifragem gera um IV novo e aleatorio - reusar IV com a mesma chave
 * quebra a seguranca do GCM (permite forjar e ate recuperar texto). O
 * authTag do GCM detecta qualquer adulteracao no texto cifrado: se alguem
 * editar o JSON na mao, decifrar falha alto, nunca devolve lixo silencioso.
 */

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12; // recomendado para GCM
const TAMANHO_CHAVE = 32; // 256 bits

export interface CampoCifrado {
  iv: string; // base64
  authTag: string; // base64
  texto: string; // base64
}

function chaveBuffer(chaveBase64: string): Buffer {
  const chave = Buffer.from(chaveBase64, "base64");
  if (chave.length !== TAMANHO_CHAVE) {
    throw new Error("COFRE_CHAVE invalida: precisa ter 32 bytes (256 bits) em base64");
  }
  return chave;
}

export function cifrar(textoPlano: string, chaveBase64: string): CampoCifrado {
  const chave = chaveBuffer(chaveBase64);
  const iv = crypto.randomBytes(TAMANHO_IV);
  const cipher = crypto.createCipheriv(ALGORITMO, chave, iv);

  const texto = Buffer.concat([cipher.update(textoPlano, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    texto: texto.toString("base64"),
  };
}

export function decifrar(campo: CampoCifrado, chaveBase64: string): string {
  const chave = chaveBuffer(chaveBase64);
  const iv = Buffer.from(campo.iv, "base64");
  const authTag = Buffer.from(campo.authTag, "base64");
  const texto = Buffer.from(campo.texto, "base64");

  const decipher = crypto.createDecipheriv(ALGORITMO, chave, iv);
  decipher.setAuthTag(authTag);

  const decifrado = Buffer.concat([decipher.update(texto), decipher.final()]);
  return decifrado.toString("utf-8");
}

/** Gera uma chave nova de 256 bits em base64, pronta para o COFRE_CHAVE do .env. */
export function gerarChave(): string {
  return crypto.randomBytes(TAMANHO_CHAVE).toString("base64");
}
