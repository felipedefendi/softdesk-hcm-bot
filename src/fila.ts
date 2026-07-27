import { abrirSessao, encerrarSessao } from "./sessao";
import { listarChamadosSemAtendente, buscarInfoEncaminhamento } from "./tickets";
import { atendenteAtual } from "./rotation";
import { lerConfiguracoes } from "./configuracoes";
import { config } from "./config";

/**
 * Fila "Sem atendente" pra tela "Fila ao vivo" do dashboard - reaproveita as
 * mesmas funcoes de leitura que o bot usa em fluxo.ts, mas sem atribuir nada.
 */

export interface ItemFila {
  numero: number;
  titulo: string;
  cliente: string;
  link: string;
  /** ISO. */
  abertoEm: string;
  /** Minutos decorridos no SLA de "Encaminhamento" no momento da consulta ao SoftDesk. */
  minutosDecorridosSla: number;
}

export interface RespostaFila {
  /** ISO - quando a lista foi de fato buscada no SoftDesk (pode ser mais antigo que agora, por causa do cache). */
  consultadoEm: string;
  limiteMinutos: number;
  /** null quando ninguem esta ativo no rodizio no momento. */
  proximoAtendente: string | null;
  chamados: ItemFila[];
}

const TTL_MS = 60 * 1000;

interface FilaCache {
  consultadoEm: string;
  limiteMinutos: number;
  chamados: ItemFila[];
}

let cache: { dados: FilaCache; expiraEm: number } | null = null;

/** Pagina real do chamado no SoftDesk (mesmo padrao usado como link nas notificacoes do Teams). */
function urlChamado(numero: number): string {
  return `${config.softdeskUrl}/encaminhar/${numero}`;
}

function proximoAtendenteOuNull(): string | null {
  try {
    return atendenteAtual();
  } catch {
    // Ninguem ativo no rodizio - a fila em si ainda vale a pena mostrar.
    return null;
  }
}

async function buscarFilaDoSoftDesk(limiteMinutos: number): Promise<FilaCache> {
  const sessao = await abrirSessao();
  try {
    const chamados = await listarChamadosSemAtendente(sessao);
    const itens: ItemFila[] = [];

    for (const chamado of chamados) {
      const info = await buscarInfoEncaminhamento(sessao, chamado.numero);
      itens.push({
        numero: chamado.numero,
        titulo: chamado.titulo,
        cliente: chamado.cliente,
        link: urlChamado(chamado.numero),
        abertoEm: chamado.criadoEm.toISOString(),
        minutosDecorridosSla: info.minutos,
      });
    }

    return { consultadoEm: new Date().toISOString(), limiteMinutos, chamados: itens };
  } finally {
    await encerrarSessao(sessao);
  }
}

/** Cache de 60s: a tela pode dar poll a vontade sem metralhar o SoftDesk a cada carregamento. */
export async function obterFila(): Promise<RespostaFila> {
  const agora = Date.now();
  if (!cache || cache.expiraEm <= agora) {
    const cfg = lerConfiguracoes();
    const dados = await buscarFilaDoSoftDesk(cfg.encaminhamentoLimiteMinutos);
    cache = { dados, expiraEm: agora + TTL_MS };
  }
  return { ...cache.dados, proximoAtendente: proximoAtendenteOuNull() };
}
