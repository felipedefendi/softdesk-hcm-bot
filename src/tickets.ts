import { tempoDecorridoEmMinutos } from "./sla";
import { headersAutenticados, type Sessao } from "./sessao";

export interface Chamado {
  numero: number;
  titulo: string;
  cliente: string;
  cdServico: number;
  cdGrupoSolucao: number;
  criadoEm: Date;
}

const LISTA_SEM_ATENDENTE_URL =
  "/chamado/json?cd_area=0&cd_cliente=0&cd_grupo_solucao=0&cd_pasta=13" +
  "&has_interaction=false&st_chamado=1&total=0&tp_requisicao=SEM_ATENDENTE&tp_usuario=ATE&text=Sem+atendente";

/**
 * Lista os chamados na fila "Sem atendente" chamando a API JSON diretamente
 * (mesma chamada que o front-end do SoftDesk faz ao clicar na aba), ordenados
 * do mais antigo para o mais novo (mais antigo = prioridade de atendimento).
 */
export async function listarChamadosSemAtendente(sessao: Sessao): Promise<Chamado[]> {
  const res = await sessao.context.get(LISTA_SEM_ATENDENTE_URL, {
    headers: headersAutenticados(sessao),
  });
  const data = await res.json();

  const chamados: Chamado[] = (data.lista ?? []).map((item: Record<string, unknown>) => ({
    numero: item.cd_chamado as number,
    titulo: item.tt_chamado as string,
    cliente: item.nm_cliente as string,
    cdServico: item.cd_servico as number,
    cdGrupoSolucao: item.cd_grupo_solucao as number,
    criadoEm: new Date(`${item.da_chamado}T${item.ha_chamado}`),
  }));

  return chamados.sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
}

/** Busca o detalhe completo do chamado (endpoint real: POST /chamado/detalhe/{id}/json). */
export async function buscarDetalheChamado(sessao: Sessao, numeroChamado: number): Promise<Record<string, unknown>> {
  const res = await sessao.context.post(`/chamado/detalhe/${numeroChamado}/json`, {
    headers: headersAutenticados(sessao),
  });

  if (!res.ok()) {
    throw new Error(`Falha ao buscar detalhe do chamado ${numeroChamado}: HTTP ${res.status()}`);
  }

  const contentType = res.headers()["content-type"] ?? "";
  if (!contentType.includes("json")) {
    throw new Error(
      `Resposta inesperada (nao-JSON) ao buscar detalhe do chamado ${numeroChamado}: content-type "${contentType}"`
    );
  }

  return res.json();
}

/** Busca o SLA do chamado e retorna minutos de Encaminhamento. */
export async function buscarMinutosEncaminhamento(sessao: Sessao, numeroChamado: number): Promise<number> {
  const data = await buscarDetalheChamado(sessao, numeroChamado);

  const sla = ((data.sla as Record<string, unknown>)?.sla ?? []) as Array<{ nome: string; decorrido: string }>;
  const encaminhamento = sla.find((s) => s.nome === "Encaminhamento");
  if (!encaminhamento) {
    throw new Error(`SLA de "Encaminhamento" nao encontrado no chamado ${numeroChamado}`);
  }

  return tempoDecorridoEmMinutos(encaminhamento.decorrido);
}
