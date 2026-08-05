import { abrirSessao, encerrarSessao } from "./sessao";
import { listarChamadosSemAtendente, buscarInfoEncaminhamento } from "./tickets";
import { proximosNAtendentes } from "./rotation";
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
  /** Quem receberia este chamado se o bot rodasse agora, em ordem de rodizio. null = ninguem disponivel. */
  atendentePrevisto: string | null;
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

interface ItemFilaCachado {
  numero: number;
  titulo: string;
  cliente: string;
  link: string;
  abertoEm: string;
  minutosDecorridosSla: number;
}

interface FilaCache {
  consultadoEm: string;
  limiteMinutos: number;
  chamados: ItemFilaCachado[];
}

let cache: { dados: FilaCache; expiraEm: number } | null = null;

/** Pagina real do chamado no SoftDesk (mesmo padrao usado como link nas notificacoes do Teams). */
function urlChamado(numero: number): string {
  return `${config.softdeskUrl}/encaminhar/${numero}`;
}

function proximosOuVazio(n: number): string[] {
  try {
    return proximosNAtendentes(n);
  } catch {
    return [];
  }
}

async function buscarFilaDoSoftDesk(limiteMinutos: number): Promise<FilaCache> {
  const sessao = await abrirSessao();
  try {
    const chamados = await listarChamadosSemAtendente(sessao);
    const itens: ItemFilaCachado[] = [];

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

  // Calcula os proximos atendentes em ordem de rodizio (um por chamado).
  // Sempre pede pelo menos 1 para o cabecalho, mesmo com fila vazia.
  const n = Math.max(1, cache.dados.chamados.length);
  const previstos = proximosOuVazio(n);

  const chamados: ItemFila[] = cache.dados.chamados.map((c, i) => ({
    ...c,
    atendentePrevisto: previstos[i] ?? null,
  }));

  return {
    ...cache.dados,
    chamados,
    proximoAtendente: previstos[0] ?? null,
  };
}
