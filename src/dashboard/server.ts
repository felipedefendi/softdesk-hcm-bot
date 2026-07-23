import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "../config";
import { atendenteAtual, definirProximoManualmente } from "../rotation";
import { atendentesAtivos, listarAtendentes, marcarInativo, reativarManualmente, reordenarAtendentes } from "../atendentes";
import { detectarRodizioTravado } from "../alertaRodizio";
import { diaEmSaoPaulo } from "../relatorios/periodos";
import { lerConfiguracoes, salvarConfiguracoes } from "../configuracoes";
import { lerStatus } from "../status";
import { lerHistorico } from "./logHistorico";
import { verificarChamados } from "../fluxo";
import { autenticar, exigirLogin, invalidarToken, NOME_COOKIE } from "./auth";

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

app.post("/api/login", limitadorLogin, (req, res) => {
  const senha = typeof req.body?.senha === "string" ? req.body.senha : "";
  const token = autenticar(senha);
  if (!token) {
    res.status(401).json({ erro: "Senha incorreta" });
    return;
  }
  res.cookie(NOME_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: true });
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  const token = req.cookies?.[NOME_COOKIE];
  if (token) invalidarToken(token);
  res.clearCookie(NOME_COOKIE);
  res.json({ ok: true });
});

app.use("/api", exigirLogin);

app.get("/api/atendentes", (req, res) => {
  res.json(listarAtendentes());
});

app.patch("/api/atendentes/:nome", (req, res) => {
  const nome = decodeURIComponent(req.params.nome);
  const { ativo, motivo, retornaEm } = req.body ?? {};

  try {
    if (ativo === false) {
      marcarInativo(nome, motivo || "Nao informado", retornaEm ?? null);
    } else if (ativo === true) {
      reativarManualmente(nome);
    }
    res.json(listarAtendentes());
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

app.put("/api/atendentes/ordem", (req, res) => {
  const ordem = Array.isArray(req.body?.ordem) ? req.body.ordem : [];

  try {
    reordenarAtendentes(ordem);
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

app.patch("/api/configuracoes", (req, res) => {
  const { pollIntervalMinutes, encaminhamentoLimiteMinutos, diasSemReceberParaAlerta } = req.body ?? {};
  const atual = lerConfiguracoes();

  salvarConfiguracoes({
    ...atual,
    pollIntervalMinutes: Number(pollIntervalMinutes) || atual.pollIntervalMinutes,
    encaminhamentoLimiteMinutos: Number(encaminhamentoLimiteMinutos) || atual.encaminhamentoLimiteMinutos,
    diasSemReceberParaAlerta: Number(diasSemReceberParaAlerta) || atual.diasSemReceberParaAlerta,
  });
  res.json(lerConfiguracoes());
});

app.get("/api/automacao", (req, res) => {
  res.json({ ativa: lerConfiguracoes().automacaoAtiva });
});

app.post("/api/automacao/pausar", (req, res) => {
  salvarConfiguracoes({ ...lerConfiguracoes(), automacaoAtiva: false });
  res.json({ ativa: false });
});

app.post("/api/automacao/retomar", (req, res) => {
  salvarConfiguracoes({ ...lerConfiguracoes(), automacaoAtiva: true });
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

app.listen(config.dashboardPort, () => {
  console.log(`Dashboard rodando em http://localhost:${config.dashboardPort}`);
});
