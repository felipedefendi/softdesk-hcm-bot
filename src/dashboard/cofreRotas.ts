import crypto from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config";
import {
  listarMetadados,
  criarCredencial,
  editarCredencial,
  arquivarCredencial,
  restaurarCredencial,
  revelarCredencial,
  type CredencialEntrada,
} from "../cofre/cofre";
import { listarSistemas, criarSistema, desativarSistema, reativarSistema } from "../cofre/sistemas";
import { registrarAcao } from "../cofre/auditoria";
import { quemEstaAgindo } from "../auditoria";

/**
 * Rotas do cofre de senhas de clientes. Montadas em /api/cofre no server.ts,
 * atras do exigirLogin global - todo mundo logado ve metadados (cliente,
 * sistema, link, validade). Revelar a senha em si exige uma segunda trava:
 * o "destrave", com o segredo proprio do cofre (COFRE_SENHA), valido por 5 min.
 */

const NOME_COOKIE_DESTRAVE = "cofre_destrave";
const TTL_DESTRAVE_MS = 5 * 60 * 1000;

// token -> expiracao. Separado do tokensValidos do login (auth.ts): a sessao
// do painel dura 12h, mas o cofre tranca de novo em 5 min mesmo com sessao ativa.
const destravesValidos = new Map<string, number>();

/** Compara em tempo constante via hash de tamanho fixo - evita vazar o tamanho da senha. */
function senhaDoCofreConfere(senha: string): boolean {
  // Sem COFRE_SENHA configurada, o cofre nunca destrava (em vez de aceitar
  // string vazia): assim uma instalacao sem o segredo fica so com o cofre
  // indisponivel, nao com ele aberto pra qualquer um.
  if (!config.cofreSenha) return false;
  const esperado = crypto.createHash("sha256").update(config.cofreSenha).digest();
  const recebido = crypto.createHash("sha256").update(senha).digest();
  return crypto.timingSafeEqual(esperado, recebido);
}

function destravar(senha: string): string | null {
  if (!senhaDoCofreConfere(senha)) return null;
  const token = crypto.randomBytes(24).toString("hex");
  destravesValidos.set(token, Date.now() + TTL_DESTRAVE_MS);
  return token;
}

function estaDestravado(token: string | undefined): boolean {
  if (!token) return false;
  const expiraEm = destravesValidos.get(token);
  if (expiraEm === undefined) return false;
  if (Date.now() >= expiraEm) {
    destravesValidos.delete(token);
    return false;
  }
  return true;
}

function exigirDestrave(req: Request, res: Response, next: NextFunction): void {
  if (estaDestravado(req.cookies?.[NOME_COOKIE_DESTRAVE])) {
    next();
    return;
  }
  res.status(423).json({ erro: "Cofre travado" });
}

/**
 * Reforco anti-CSRF alem do sameSite=lax do cookie: se o navegador mandou
 * Origin, ela precisa bater com o host chamado. Quando o navegador nao manda
 * Origin (nem sempre acontece em GET simples), o sameSite segue sendo a defesa.
 */
function exigirOrigemValida(req: Request, res: Response, next: NextFunction): void {
  const origem = req.headers.origin;
  if (!origem || origem === `${req.protocol}://${req.get("host")}`) {
    next();
    return;
  }
  res.status(403).json({ erro: "Origem invalida" });
}

const limitadorDestrave = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Aguarde um minuto." },
});

const limitadorRevelar = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Aguarde um minuto." },
});

/**
 * Com middleware extra na cadeia da rota, as tipagens do Express 5 as vezes
 * inferem req.params como string | string[] em vez de string - na pratica,
 * um segmento nomeado (:id) e sempre string.
 */
function paramId(req: Request): string {
  return req.params.id as string;
}

function nomeSistema(id: string): string {
  return listarSistemas().find((s) => s.id === id)?.nome ?? id;
}

function entradaCredencial(body: unknown): CredencialEntrada {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    cliente: typeof b.cliente === "string" ? b.cliente : "",
    sistemaId: typeof b.sistemaId === "string" ? b.sistemaId : "",
    link: typeof b.link === "string" ? b.link : null,
    validade: typeof b.validade === "string" ? b.validade : null,
    login: typeof b.login === "string" ? b.login : "",
    senha: typeof b.senha === "string" ? b.senha : "",
    observacoes: typeof b.observacoes === "string" ? b.observacoes : null,
  };
}

export const cofreRouter = express.Router();

cofreRouter.get("/sistemas", (req, res) => {
  res.json(listarSistemas());
});

cofreRouter.post("/sistemas", exigirOrigemValida, (req, res) => {
  const nome = typeof req.body?.nome === "string" ? req.body.nome : "";
  try {
    res.json(criarSistema(nome));
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

cofreRouter.post("/sistemas/:id/desativar", exigirOrigemValida, (req, res) => {
  try {
    desativarSistema(paramId(req));
    res.json(listarSistemas());
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

cofreRouter.post("/sistemas/:id/reativar", exigirOrigemValida, (req, res) => {
  try {
    reativarSistema(paramId(req));
    res.json(listarSistemas());
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

cofreRouter.get("/credenciais", (req, res) => {
  res.json(listarMetadados());
});

cofreRouter.post("/credenciais", exigirOrigemValida, (req, res) => {
  try {
    const criada = criarCredencial(entradaCredencial(req.body));
    registrarAcao(quemEstaAgindo(req), "criar", criada.id, criada.cliente, nomeSistema(criada.sistemaId));
    res.json(criada);
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

cofreRouter.patch("/credenciais/:id", exigirOrigemValida, (req, res) => {
  try {
    const editada = editarCredencial(paramId(req), entradaCredencial(req.body));
    registrarAcao(quemEstaAgindo(req), "editar", editada.id, editada.cliente, nomeSistema(editada.sistemaId));
    res.json(editada);
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

cofreRouter.post("/credenciais/:id/arquivar", exigirOrigemValida, (req, res) => {
  try {
    const arquivada = arquivarCredencial(paramId(req));
    registrarAcao(quemEstaAgindo(req), "arquivar", arquivada.id, arquivada.cliente, nomeSistema(arquivada.sistemaId));
    res.json(listarMetadados());
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

cofreRouter.post("/credenciais/:id/restaurar", exigirOrigemValida, (req, res) => {
  try {
    const restaurada = restaurarCredencial(paramId(req));
    registrarAcao(quemEstaAgindo(req), "restaurar", restaurada.id, restaurada.cliente, nomeSistema(restaurada.sistemaId));
    res.json(listarMetadados());
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

cofreRouter.post("/destravar", limitadorDestrave, exigirOrigemValida, (req, res) => {
  const senha = typeof req.body?.senha === "string" ? req.body.senha : "";
  const token = destravar(senha);
  if (!token) {
    // 403, nao 401: senha do cofre errada e' um "proibido", nao "sessao
    // expirada". Com 401 o cliente (ver api/cliente.ts) trata como logout e
    // derruba a sessao do painel inteiro em vez de so avisar do cofre.
    res.status(403).json({ erro: "Senha incorreta" });
    return;
  }
  res.cookie(NOME_COOKIE_DESTRAVE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: TTL_DESTRAVE_MS,
  });
  res.json({ ok: true });
});

cofreRouter.post("/trancar", (req, res) => {
  const token = req.cookies?.[NOME_COOKIE_DESTRAVE];
  if (token) destravesValidos.delete(token);
  res.clearCookie(NOME_COOKIE_DESTRAVE);
  res.json({ ok: true });
});

cofreRouter.get("/credenciais/:id/revelar", limitadorRevelar, exigirOrigemValida, exigirDestrave, (req, res) => {
  res.set("Cache-Control", "no-store");
  const id = paramId(req);
  try {
    const dados = revelarCredencial(id);
    const meta = listarMetadados().find((c) => c.id === id);
    if (meta) registrarAcao(quemEstaAgindo(req), "revelar", meta.id, meta.cliente, nomeSistema(meta.sistemaId));
    res.json(dados);
  } catch {
    // Mensagem generica de proposito: nao vazar detalhe interno de cripto
    // (ex.: falha do authTag por adulteracao) pra quem chama a rota.
    res.status(400).json({ erro: "Nao foi possivel revelar a credencial" });
  }
});
