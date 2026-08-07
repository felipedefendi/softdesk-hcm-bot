import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "../config";
import { atendenteAtual, definirProximoManualmente } from "../rotation";
import {
  atendentesAtivos,
  codigoDoAtendenteOuNull,
  listarAtendentes,
  marcarInativo,
  reativarManualmente,
  reordenarAtendentes,
} from "../atendentes";
import { detectarRodizioTravado } from "../alertaRodizio";
import { diaEmSaoPaulo } from "../relatorios/periodos";
import { lerConfiguracoes, salvarConfiguracoes } from "../configuracoes";
import { lerStatus } from "../status";
import { lerHistorico } from "./logHistorico";
import { verificarChamados } from "../fluxo";
import { obterFila } from "../fila";
import { listarExecucoes } from "../execucoes";
import { autenticar, exigirLogin, invalidarToken, NOME_COOKIE } from "./auth";
import { exigirPermissao } from "./exigirPermissao";
import { lerAuditoria, quemEstaAgindo, registrarAcao } from "../auditoria";
import { cofreRouter } from "./cofreRotas";
import { agendaRouter } from "./agendaRotas";
import { conviteRouter } from "./conviteRotas";
import { usuariosRouter } from "./usuariosRotas";

const app = express();
// Necessario atras do nginx: sem isso o Express nao confia no X-Forwarded-For
// (rate limiting por IP e o req.ip em geral ficariam errados).
app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "..", "public")));

const limitadorLogin = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Aguarde um minuto." },
});

app.post("/api/login", limitadorLogin, async (req, res) => {
  const senha = typeof req.body?.senha === "string" ? req.body.senha : "";
  const email = typeof req.body?.email === "string" ? req.body.email : undefined;

  const resultado = await autenticar({ email, senha });
  if ("erro" in resultado) {
    res.status(401).json({ erro: resultado.erro });
    return;
  }
  res.cookie(NOME_COOKIE, resultado.token, { httpOnly: true, sameSite: "lax", secure: true });
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  const token = req.cookies?.[NOME_COOKIE];
  if (token) invalidarToken(token);
  res.clearCookie(NOME_COOKIE);
  res.json({ ok: true });
});

// Publica de proposito, antes do exigirLogin: quem chega por um link de
// convite ainda nao tem sessao nenhuma.
app.use("/api/convite", conviteRouter);

app.use("/api", exigirLogin);
app.use("/api/cofre", cofreRouter);
app.use("/api/agenda", agendaRouter);
app.use("/api/usuarios", usuariosRouter);

app.get("/api/atendentes", (req, res) => {
  res.json(listarAtendentes());
});

app.patch(
  "/api/atendentes/:nome",
  exigirPermissao("atendente:desativar", (req) => ({
    codigoAtendente: codigoDoAtendenteOuNull(decodeURIComponent(req.params.nome as string)),
  })),
  (req, res) => {
    const nome = decodeURIComponent(req.params.nome as string);
    const { ativo, motivo, retornaEm } = req.body ?? {};

    try {
      if (ativo === false) {
        marcarInativo(nome, motivo || "Nao informado", retornaEm ?? null);
        registrarAcao(quemEstaAgindo(req), "atendente:desativar", `${nome} - ${motivo || "Nao informado"}`);
      } else if (ativo === true) {
        reativarManualmente(nome);
        registrarAcao(quemEstaAgindo(req), "atendente:reativar", nome);
      }
      res.json(listarAtendentes());
    } catch (err) {
      res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
    }
  }
);

app.put("/api/atendentes/ordem", exigirPermissao("rodizio:reordenar"), (req, res) => {
  const ordem = Array.isArray(req.body?.ordem) ? req.body.ordem : [];

  try {
    reordenarAtendentes(ordem);
    registrarAcao(quemEstaAgindo(req), "rodizio:reordenar", ordem.join(", "));
    res.json(listarAtendentes());
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/rotation", (req, res) => {
  try {
    res.json({ proximo: atendenteAtual() });
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/rotation/proximo", (req, res) => {
  const nome = typeof req.body?.nome === "string" ? req.body.nome : "";

  try {
    definirProximoManualmente(nome);
    registrarAcao(quemEstaAgindo(req), "rodizio:definir-proximo", nome);
    res.json({ proximo: atendenteAtual() });
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/log", (req, res) => {
  res.json(lerHistorico());
});

app.get("/api/status", (req, res) => {
  res.json(lerStatus());
});

/**
 * Quem esta logado, pro frontend decidir o que mostrar - so o que a UI
 * precisa pra isso, nunca hash/salt. A autorizacao de verdade continua
 * sendo feita no servidor em cada rota (exigirPermissao); isto e so pra
 * esconder botao que a pessoa nao pode usar, o que e UX, nao seguranca.
 */
app.get("/api/eu", (req, res) => {
  const { nome, papel, codigoAtendente } = req.sessao!.usuario;
  res.json({ nome, papel, codigoAtendente });
});

app.get("/api/fila", async (req, res) => {
  try {
    res.json(await obterFila());
  } catch (err) {
    res.status(500).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/execucoes", (req, res) => {
  res.json(listarExecucoes());
});

/** Quem fez o que no painel - restrita a admin (ver PLANO-USUARIOS.md). */
app.get("/api/auditoria", exigirPermissao("auditoria:ver"), (req, res) => {
  res.json(lerAuditoria());
});

/**
 * Atendentes ativos que ha muito tempo nao recebem chamado - sinal de rodizio
 * travado. Fica so aqui, nunca vai pro Teams: e diagnostico de defeito, nao
 * comparacao entre pessoas.
 */
app.get("/api/alerta-rodizio", (req, res) => {
  try {
    const limite = lerConfiguracoes().diasSemReceberParaAlerta;
    const ativos = atendentesAtivos().map((a) => a.nome);
    res.json({ limite, atendentes: detectarRodizioTravado(lerHistorico(), ativos, diaEmSaoPaulo(), limite) });
  } catch (err) {
    res.status(500).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/configuracoes", (req, res) => {
  res.json(lerConfiguracoes());
});

app.patch("/api/configuracoes", exigirPermissao("configuracoes:alterar"), (req, res) => {
  const { pollIntervalMinutes, encaminhamentoLimiteMinutos, diasSemReceberParaAlerta } = req.body ?? {};
  const atual = lerConfiguracoes();

  const nova = {
    ...atual,
    pollIntervalMinutes: Number(pollIntervalMinutes) || atual.pollIntervalMinutes,
    encaminhamentoLimiteMinutos: Number(encaminhamentoLimiteMinutos) || atual.encaminhamentoLimiteMinutos,
    diasSemReceberParaAlerta: Number(diasSemReceberParaAlerta) || atual.diasSemReceberParaAlerta,
  };
  salvarConfiguracoes(nova);
  registrarAcao(
    quemEstaAgindo(req),
    "configuracoes:alterar",
    `intervalo=${nova.pollIntervalMinutes}min limite=${nova.encaminhamentoLimiteMinutos}min alerta=${nova.diasSemReceberParaAlerta}dias`
  );
  res.json(lerConfiguracoes());
});

app.get("/api/automacao", (req, res) => {
  res.json({ ativa: lerConfiguracoes().automacaoAtiva });
});

app.post("/api/automacao/pausar", exigirPermissao("automacao:pausar-retomar"), (req, res) => {
  salvarConfiguracoes({ ...lerConfiguracoes(), automacaoAtiva: false });
  registrarAcao(quemEstaAgindo(req), "automacao:pausar", "");
  res.json({ ativa: false });
});

app.post("/api/automacao/retomar", exigirPermissao("automacao:pausar-retomar"), (req, res) => {
  salvarConfiguracoes({ ...lerConfiguracoes(), automacaoAtiva: true });
  registrarAcao(quemEstaAgindo(req), "automacao:retomar", "");
  res.json({ ativa: true });
});

let verificacaoEmAndamento = false;

app.post("/api/verificar-agora", async (req, res) => {
  if (verificacaoEmAndamento) {
    res.status(409).json({ erro: "Ja existe uma verificacao em andamento" });
    return;
  }

  verificacaoEmAndamento = true;
  try {
    const resultado = await verificarChamados();
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err instanceof Error ? err.message : String(err) });
  } finally {
    verificacaoEmAndamento = false;
  }
});

/**
 * Fallback de SPA: o frontend (web/) usa roteamento client-side (React
 * Router), entao uma rota como /historico so existe depois do JS carregar -
 * nao e um arquivo real. Sem isso, recarregar a pagina numa rota que nao a
 * raiz (ou abrir um link direto pra ela) cai em 404, porque express.static
 * so serve arquivo que existe de verdade. Fica por ultimo de proposito: so
 * e alcancado se nada antes (estatico ou /api) ja respondeu.
 */
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "..", "public", "index.html"));
});

app.listen(config.dashboardPort, () => {
  console.log(`Dashboard rodando em http://localhost:${config.dashboardPort}`);
});
