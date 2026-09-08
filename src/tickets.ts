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

export interface ContatoChamado {
  solicitante: string | null;
  email: string | null;
  telefone: string | null;
}

export interface InfoEncaminhamento extends ContatoChamado {
  minutos: number;
  /**
   * Minutos do SLA de "Resolucao". Em chamado novo costuma ser 0 (so o SLA de
   * Encaminhamento esta correndo); passa a crescer nos que ja foram atendidos e
   * voltaram pra "Sem atendente" - ver deveEncaminhar.
   */
  minutosResolucao: number;
}

type ItemSla = { nome: string; decorrido: string };

function slasDoDetalhe(data: Record<string, unknown>): ItemSla[] {
  return ((data.sla as Record<string, unknown>)?.sla ?? []) as ItemSla[];
}

/** Compara nome de SLA sem depender de acento nem caixa (ex.: "Resolução" ~ "resolucao"). */
function normalizarNome(nome: string): string {
  return nome.normalize("NFD").replace(/[^\x00-\x7f]/g, "").toLowerCase();
}

/** Minutos decorridos no SLA de "Encaminhamento", a partir do detalhe ja carregado. */
function minutosEncaminhamentoDoDetalhe(data: Record<string, unknown>, numeroChamado: number): number {
  const encaminhamento = slasDoDetalhe(data).find((s) => s.nome === "Encaminhamento");
  if (!encaminhamento) {
    throw new Error(`SLA de "Encaminhamento" nao encontrado no chamado ${numeroChamado}`);
  }

  return tempoDecorridoEmMinutos(encaminhamento.decorrido);
}

/**
 * Minutos do SLA de "Resolucao", ou 0 quando ele nao existe ou ainda nao
 * comecou. Diferente do de Encaminhamento, nao lanca se faltar: chamado novo
 * pode ter so o de Encaminhamento correndo, e isso e' esperado. O nome e casado
 * sem acento/caixa pra nao quebrar se o texto exato do SoftDesk variar.
 */
export function minutosResolucaoDoDetalhe(data: Record<string, unknown>): number {
  const resolucao = slasDoDetalhe(data).find((s) => normalizarNome(s.nome).includes("resolu"));
  if (!resolucao) return 0;
  try {
    return tempoDecorridoEmMinutos(resolucao.decorrido);
  } catch {
    return 0; // formato inesperado ou SLA ainda nao iniciado
  }
}

/**
 * Decide se o chamado ja deve ir pro proximo atendente. Pura, pra ter teste.
 *
 * Encaminha quando o SLA de Encaminhamento passou do limite (fluxo normal) OU
 * quando o de Resolucao ja passou do de Encaminhamento. Esse segundo caso cobre
 * os chamados transferidos de volta pra "Sem atendente": neles o Encaminhamento
 * fica travado e nunca cresce, enquanto o de Resolucao segue correndo - sem esta
 * regra ficariam presos fora do rodizio pra sempre. Num chamado novo a Resolucao
 * e 0 e o Encaminhamento corre, entao a regra so dispara mesmo nos travados.
 */
export function deveEncaminhar(minutosEncaminhamento: number, minutosResolucao: number, limiteMinutos: number): boolean {
  return minutosEncaminhamento >= limiteMinutos || minutosResolucao > minutosEncaminhamento;
}

/** Normaliza um campo texto do SoftDesk: vazio ou so espacos vira null. */
function textoOuNull(valor: unknown): string | null {
  const s = typeof valor === "string" ? valor.trim() : "";
  return s.length > 0 ? s : null;
}

/** Dados do solicitante (nome, e-mail, telefone) do objeto "chamado" do detalhe. */
function contatoDoDetalhe(data: Record<string, unknown>): ContatoChamado {
  const c = (data.chamado ?? {}) as Record<string, unknown>;
  return {
    solicitante: textoOuNull(c.nm_usuario),
    email: textoOuNull(c.em_usuario),
    telefone: textoOuNull(c.cel_usuario) ?? textoOuNull(c.fn_usuario),
  };
}

/**
 * Uma unica ida ao detalhe do chamado devolvendo tudo que a notificacao precisa:
 * minutos de encaminhamento (pra checar o SLA) mais os dados do solicitante.
 * Evita buscar o detalhe duas vezes por chamado.
 */
export async function buscarInfoEncaminhamento(sessao: Sessao, numeroChamado: number): Promise<InfoEncaminhamento> {
  const data = await buscarDetalheChamado(sessao, numeroChamado);
  return {
    minutos: minutosEncaminhamentoDoDetalhe(data, numeroChamado),
    minutosResolucao: minutosResolucaoDoDetalhe(data),
    ...contatoDoDetalhe(data),
  };
}
