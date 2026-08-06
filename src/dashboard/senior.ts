import { config } from "../config";

export type ResultadoSenior = { ok: true; username: string } | { ok: false; erro: string };

interface RespostaLogin {
  /** String contendo um JSON com access_token/refresh_token/username. */
  jsonToken?: string;
  /** Presente quando a conta exige verificacao em duas etapas. */
  mfaInfo?: unknown;
}

/**
 * Autentica no Senior X Platform com usuario/senha. So confirma a identidade:
 * o access_token/refresh_token que a Senior devolve sao descartados de
 * proposito - quem loga ganha uma sessao propria do painel (ver auth.ts), e o
 * painel nao chama nenhuma outra API da Senior em nome da pessoa. A senha nunca
 * e registrada em log.
 */
export async function autenticarNaSenior(username: string, senha: string): Promise<ResultadoSenior> {
  let resposta: Response;
  try {
    resposta = await fetch(config.seniorAuthUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: senha, scope: config.seniorScope }),
    });
  } catch {
    return { ok: false, erro: "Serviço de login da Senior indisponível. Tente novamente em instantes." };
  }

  // Mensagem generica no 401 pra nao diferenciar "usuario nao existe" de "senha
  // errada" - mesma razao do login por e-mail em auth.ts.
  if (resposta.status === 401) return { ok: false, erro: "E-mail ou senha incorretos" };
  if (!resposta.ok) return { ok: false, erro: "Não foi possível validar o login agora. Tente novamente." };

  const corpo = (await resposta.json().catch(() => null)) as RespostaLogin | null;

  // MFA: a Senior devolve mfaInfo (com token temporario) em vez de jsonToken. O
  // painel ainda nao faz o segundo passo, entao para aqui com um aviso claro.
  if (corpo?.mfaInfo) {
    return {
      ok: false,
      erro: "Sua conta Senior exige verificação em duas etapas (MFA), que ainda não é suportada aqui. Fale com o administrador.",
    };
  }

  if (!corpo?.jsonToken) return { ok: false, erro: "Resposta inesperada do login da Senior." };

  let interno: { username?: string };
  try {
    interno = JSON.parse(corpo.jsonToken) as { username?: string };
  } catch {
    return { ok: false, erro: "Resposta inesperada do login da Senior." };
  }

  return { ok: true, username: interno.username ?? username };
}
