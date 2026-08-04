import crypto from "node:crypto";
import express, { type Request } from "express";
import {
  lerDiasEspeciais,
  lerFerias,
  removerDiaEspecial,
  removerFerias,
  salvarDiasEspeciais,
  salvarFerias,
} from "../agenda/armazenamento";
import { diasSemAtendenteDisponivel, estadoDoDia, validarDiaEspecial, validarFerias } from "../agenda/regras";
import { feriadosDoAno } from "../agenda/feriados";
import type { DiaEspecial, Ferias } from "../agenda/tipos";
import { codigoDoAtendenteOuNull, listarAtendentes } from "../atendentes";
import { diaEmSaoPaulo, horaEmSaoPaulo } from "../relatorios/periodos";
import { exigirPermissao } from "./exigirPermissao";
import { quemEstaAgindo, registrarAcao } from "../auditoria";

/**
 * Rotas da Agenda (ferias e dias especiais). Montadas em /api/agenda no
 * server.ts, atras do exigirLogin global.
 *
 * Sem o exigirOrigemValida do cofre de proposito: aqui a barra e a mesma do
 * resto do painel (atendentes, configuracoes), que se apoia no sameSite=lax do
 * cookie. O reforco extra existe la porque o cofre guarda senha de cliente.
 */

export const agendaRouter = express.Router();

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/** So os nomes que o rodizio de fato considera - ferias de quem esta inativo nao muda nada. */
function nomesCadastrados(): string[] {
  return listarAtendentes().map((a) => a.nome);
}

function listaDeTextos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
}

function diaEspecialDoBody(body: unknown): DiaEspecial | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const data = texto(b.data);
  const motivo = texto(b.motivo);

  if (b.tipo === "bloqueado") return { data, tipo: "bloqueado", motivo };
  if (b.tipo === "janela") {
    // Distingue "campo ausente" (dado antigo, ou tela sem restringir a escala -
    // time inteiro participa) de "mandou lista vazia" (usuario ligou a
    // restricao mas nao marcou ninguem - validarDiaEspecial recusa isso).
    // Achatar os dois casos aqui faria a validacao nunca acusar o segundo.
    return {
      data,
      tipo: "janela",
      inicio: texto(b.inicio),
      fim: texto(b.fim),
      motivo,
      ...(Array.isArray(b.escalados) ? { escalados: listaDeTextos(b.escalados) } : {}),
    };
  }
  return null;
}

agendaRouter.get("/", (req, res) => {
  res.json({ diasEspeciais: lerDiasEspeciais(), ferias: lerFerias() });
});

/** Estado de agora, pra faixa da Visao geral. */
agendaRouter.get("/hoje", (req, res) => {
  res.json(estadoDoDia(diaEmSaoPaulo(), horaEmSaoPaulo(), lerDiasEspeciais()));
});

agendaRouter.get("/feriados-sugeridos", exigirPermissao("agenda:dia-especial"), (req, res) => {
  const ano = Number(req.query.ano);
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    res.status(400).json({ erro: "Informe um ano entre 2000 e 2100." });
    return;
  }

  // Ja cadastrado nao vira sugestao: o botao pode ser reexecutado sem encher a
  // tela de conferencia com o que voce ja decidiu.
  const existentes = new Set(lerDiasEspeciais().map((d) => d.data));
  res.json(feriadosDoAno(ano).filter((f) => !existentes.has(f.dia.data)));
});

/**
 * Aceita um dia ou uma lista (o botao de feriados manda varios de uma vez).
 * Grava tudo ou nada: meia lista aplicada seria pior de entender do que a
 * mensagem de erro.
 */
agendaRouter.post("/dias-especiais", exigirPermissao("agenda:dia-especial"), (req, res) => {
  const bruto = Array.isArray(req.body) ? req.body : [req.body];
  const dias: DiaEspecial[] = [];

  for (const item of bruto) {
    const dia = diaEspecialDoBody(item);
    if (!dia) {
      res.status(400).json({ erro: 'O campo "tipo" precisa ser "bloqueado" ou "janela".' });
      return;
    }

    const erro = validarDiaEspecial(dia, nomesCadastrados());
    if (erro) {
      res.status(400).json({ erro });
      return;
    }
    dias.push(dia);
  }

  const salvos = salvarDiasEspeciais(dias);
  registrarAcao(quemEstaAgindo(req), "agenda:dia-especial:criar", dias.map((d) => `${d.data} (${d.motivo})`).join(", "));
  res.json(salvos);
});

agendaRouter.delete("/dias-especiais/:data", exigirPermissao("agenda:dia-especial"), (req, res) => {
  const data = decodeURIComponent(req.params.data as string);
  const lista = removerDiaEspecial(data);
  registrarAcao(quemEstaAgindo(req), "agenda:dia-especial:remover", data);
  res.json(lista);
});

/**
 * Cria ou edita ferias. Devolve, junto da lista, os dias em que o rodizio
 * ficaria sem ninguem - aviso, nao trava: deixar a equipe inteira fora pode ser
 * proposital, e barrar o cadastro seria o sistema achando que sabe mais.
 */
agendaRouter.post(
  "/ferias",
  exigirPermissao("agenda:ferias", (req) => ({
    codigoAtendente: codigoDoAtendenteOuNull(texto((req.body as Record<string, unknown> | undefined)?.atendente)),
  })),
  (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const observacao = texto(b.observacao);
    const nova: Ferias = {
      id: texto(b.id) || crypto.randomUUID(),
      atendente: texto(b.atendente),
      inicio: texto(b.inicio),
      fim: texto(b.fim),
      ...(observacao ? { observacao } : {}),
    };

    const existentes = lerFerias();
    const erro = validarFerias(nova, existentes, nomesCadastrados());
    if (erro) {
      res.status(400).json({ erro });
      return;
    }

    const ferias = salvarFerias(nova);
    registrarAcao(quemEstaAgindo(req), "agenda:ferias:criar", `${nova.atendente} de ${nova.inicio} a ${nova.fim}`);
    const ativos = listarAtendentes()
      .filter((a) => a.ativo)
      .map((a) => a.nome);

    res.json({
      ferias,
      avisoSemNinguem: diasSemAtendenteDisponivel({ inicio: nova.inicio, fim: nova.fim }, ativos, ferias, lerDiasEspeciais()),
    });
  }
);

agendaRouter.delete(
  "/ferias/:id",
  exigirPermissao("agenda:ferias", (req) => {
    // O alvo e de quem sao as ferias que estao sendo apagadas, nao quem esta
    // apagando - um id que nao existe mais vira null e nega pra quem nao e
    // admin (remover() ja e idempotente, entao isso nao muda o resultado
    // final quando quem chama tem permissao).
    const alvo = lerFerias().find((f) => f.id === req.params.id);
    return { codigoAtendente: alvo ? codigoDoAtendenteOuNull(alvo.atendente) : null };
  }),
  (req, res) => {
    const id = req.params.id as string;
    const alvo = lerFerias().find((f) => f.id === id);
    const lista = removerFerias(id);
    registrarAcao(quemEstaAgindo(req), "agenda:ferias:remover", alvo ? `${alvo.atendente} de ${alvo.inicio} a ${alvo.fim}` : id);
    res.json(lista);
  }
);
