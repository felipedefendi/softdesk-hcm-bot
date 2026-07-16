import { request, type APIRequestContext } from "playwright";
import { config } from "./config";

const BASE_URL = "https://js.soft4.com.br";

export interface Sessao {
  context: APIRequestContext;
  csrfToken: string;
  xsrfToken: string;
}

/** Extrai o <meta name="csrf-token"> do HTML de uma pagina (sem navegador, so regex no texto). */
async function obterCsrfTokenDaPagina(context: APIRequestContext, path: string): Promise<string> {
  const res = await context.get(path);
  const html = await res.text();
  const match = html.match(/<meta name="csrf-token" content="([^"]+)"/);

  if (!match) {
    throw new Error(`Nao foi possivel encontrar o csrf-token na pagina "${path}".`);
  }
  return match[1];
}

/** Le o valor do cookie XSRF-TOKEN (usado pela SPA como header x-xsrf-token). */
async function obterXsrfTokenDoCookie(context: APIRequestContext): Promise<string> {
  const estado = await context.storageState();
  const cookie = estado.cookies.find((c) => c.name === "XSRF-TOKEN");

  if (!cookie) {
    throw new Error("Cookie XSRF-TOKEN nao encontrado apos carregar a pagina de login.");
  }
  return decodeURIComponent(cookie.value);
}

/**
 * Autentica no SoftDesk via chamadas HTTP diretas (sem abrir navegador).
 * O Playwright gerencia os cookies de sessao automaticamente dentro do
 * mesmo APIRequestContext, igual um navegador faria.
 */
export async function abrirSessao(): Promise<Sessao> {
  const context = await request.newContext({ baseURL: BASE_URL });

  const csrfToken = await obterCsrfTokenDaPagina(context, "/login");
  const xsrfToken = await obterXsrfTokenDoCookie(context);

  const res = await context.post("/login", {
    headers: {
      accept: "application/json, text/plain, */*",
      "x-csrf-token": csrfToken,
      "x-xsrf-token": xsrfToken,
      "x-requested-with": "XMLHttpRequest",
    },
    data: {
      lg_usuario: config.email,
      sh_usuario: config.password,
      tp_usuario: "A",
      resposta: "",
      redirect_by_url: "",
    },
  });

  if (!res.ok()) {
    throw new Error(`Login no SoftDesk falhou: HTTP ${res.status()}`);
  }

  return { context, csrfToken, xsrfToken };
}

export async function encerrarSessao(sessao: Sessao): Promise<void> {
  await sessao.context.dispose();
}

/** Headers padrao exigidos por toda chamada autenticada a API do SoftDesk. */
export function headersAutenticados(sessao: Sessao): Record<string, string> {
  return {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
    "x-csrf-token": sessao.csrfToken,
    "x-xsrf-token": sessao.xsrfToken,
    "x-requested-with": "XMLHttpRequest",
  };
}
