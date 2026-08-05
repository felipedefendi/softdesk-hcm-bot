import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import { diaEmSaoPaulo, formatarISO } from "./relatorios/periodos";

export interface Atendente {
  nome: string;
  codigoAtendente: number;
  ativo: boolean;
  motivoInatividade: string | null;
  /** Data no formato YYYY-MM-DD. Quando definida e ja passou, reativa automaticamente. */
  retornaEm: string | null;
  /**
   * E-mail/UPN do atendente no Teams (Azure AD). Quando preenchido, o nome no
   * card de notificacao vira uma @mention de verdade. Opcional: sem ele, o card
   * mostra o nome como texto simples, sem quebrar nada.
   */
  emailTeams?: string | null;
}

const ARQUIVO = path.join(__dirname, "..", "state", "atendentes.json");

export function listarAtendentes(): Atendente[] {
  const raw = fs.readFileSync(ARQUIVO, "utf-8");
  return JSON.parse(raw) as Atendente[];
}

function salvar(atendentes: Atendente[]): void {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(atendentes, null, 2));
}

export function atendentesAtivos(): Atendente[] {
  return listarAtendentes().filter((a) => a.ativo);
}

/** Momento atual em SP como "YYYY-MM-DDTHH:MM" — mesmo formato do retornaEm com horario. */
function agoraEmSaoPaulo(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).replace(" ", "T").substring(0, 16);
}

/**
 * Reativa automaticamente quem tem "retornaEm" na data atual ou anterior.
 * Deve ser chamado antes de calcular o proximo da fila. Retorna true se
 * algum atendente foi reativado.
 *
 * Aceita dois formatos:
 *   YYYY-MM-DD        — reativa no inicio do dia indicado (comportamento original)
 *   YYYY-MM-DDTHH:MM  — reativa quando o horario indicado (em SP) ja passou
 */
export function reativarAutomaticamente(): boolean {
  const atendentes = listarAtendentes();
  // Dia civil de Sao Paulo, nao UTC: a VM roda em UTC e o softdesk-bot.service
  // nao fixa TZ, entao `toISOString()` ja marcava amanha a partir das 18:00
  // locais - quem tinha retorno pra amanha voltava pro rodizio hoje a tarde,
  // bem dentro das ultimas passadas do dia (o timer vai ate 18:55).
  const hoje = formatarISO(diaEmSaoPaulo());
  const agoraSP = agoraEmSaoPaulo();
  let mudou = false;

  for (const a of atendentes) {
    if (!a.ativo && a.retornaEm) {
      const passou = a.retornaEm.includes("T") ? a.retornaEm <= agoraSP : a.retornaEm <= hoje;
      if (passou) {
        a.ativo = true;
        a.motivoInatividade = null;
        a.retornaEm = null;
        mudou = true;
      }
    }
  }

  if (mudou) salvar(atendentes);
  return mudou;
}

export function marcarInativo(nome: string, motivo: string, retornaEm: string | null): void {
  const atendentes = listarAtendentes();
  const alvo = atendentes.find((a) => a.nome === nome);
  if (!alvo) throw new Error(`Atendente nao encontrado: ${nome}`);
  alvo.ativo = false;
  alvo.motivoInatividade = motivo;
  alvo.retornaEm = retornaEm;
  salvar(atendentes);
}

export function reativarManualmente(nome: string): void {
  const atendentes = listarAtendentes();
  const alvo = atendentes.find((a) => a.nome === nome);
  if (!alvo) throw new Error(`Atendente nao encontrado: ${nome}`);
  alvo.ativo = true;
  alvo.motivoInatividade = null;
  alvo.retornaEm = null;
  salvar(atendentes);
}

/**
 * Aplica uma nova ordem de rodizio (drag-and-drop no dashboard). A ordem do
 * rodizio e a propria ordem do array em disco (ver rotation.ts), entao
 * reordenar e so reescrever o arquivo com os mesmos atendentes na ordem
 * recebida - nenhum outro campo muda.
 */
export function reordenarAtendentes(novaOrdem: string[]): void {
  const atuais = listarAtendentes();
  const porNome = new Map(atuais.map((a) => [a.nome, a]));

  const mesmoConjunto =
    novaOrdem.length === atuais.length && novaOrdem.every((nome) => porNome.has(nome)) && new Set(novaOrdem).size === novaOrdem.length;

  if (!mesmoConjunto) {
    throw new Error("A nova ordem precisa conter exatamente os mesmos atendentes cadastrados, sem repetir.");
  }

  salvar(novaOrdem.map((nome) => porNome.get(nome)!));
}

export function codigoDoAtendente(nome: string): number {
  const alvo = listarAtendentes().find((a) => a.nome === nome);
  if (!alvo) throw new Error(`Atendente nao encontrado: ${nome}`);
  return alvo.codigoAtendente;
}

/**
 * Igual a codigoDoAtendente, mas devolve null em vez de lancar. Usado pra
 * resolver o alvo de uma checagem de permissao (ver exigirPermissao.ts): um
 * nome que nao existe deve negar pra quem nao e admin, nao derrubar a
 * requisicao antes da rota poder dar o proprio erro de "nao encontrado".
 */
export function codigoDoAtendenteOuNull(nome: string): number | null {
  return listarAtendentes().find((a) => a.nome === nome)?.codigoAtendente ?? null;
}

/**
 * UPN completo do atendente no Teams (para @mention no card), ou null se nao
 * cadastrado. O cadastro guarda so o usuario (ex.: "felipe.prado") e o dominio
 * (TEAMS_EMAIL_DOMAIN) e anexado aqui. Se o valor ja tiver "@", usa como esta;
 * se nao houver dominio configurado, retorna null pra nao gerar menção quebrada.
 */
export function emailTeamsDoAtendente(nome: string): string | null {
  const alvo = listarAtendentes().find((a) => a.nome === nome);
  const usuario = alvo?.emailTeams?.trim();
  if (!usuario) return null;
  if (usuario.includes("@")) return usuario;
  if (!config.teamsEmailDomain) return null;
  return `${usuario}@${config.teamsEmailDomain}`;
}
