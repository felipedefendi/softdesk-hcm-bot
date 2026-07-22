/**
 * Cliente da pesquisa de chamados do SoftDesk (`tp_requisicao=PES_RESULTADO`),
 * usada pelos relatorios. Diferente da listagem de "Sem atendente" do tickets.ts,
 * esta aceita intervalo de datas arbitrario - o historico fica no SoftDesk, nao
 * precisamos acumular nada localmente.
 *
 * Contagem sai de graca: uma consulta com `limit=1` ja devolve o total em
 * `treeview.total`, sem baixar registro nenhum.
 */
import { headersAutenticados, type Sessao } from "./sessao";
import { formatarBR, type DiaCivil } from "./relatorios/periodos";

/** Teto de seguranca: a paginacao para aqui mesmo que o total diga o contrario. */
const MAXIMO_DE_PAGINAS = 40;
const TAMANHO_DA_PAGINA = 50;

export interface FiltroPesquisa {
  inicio: DiaCivil;
  fim: DiaCivil;
  /** Constantes do SoftDesk, ex.: "EM_ATENDIMENTO". Vazio = todos os status. */
  status?: string[];
  /**
   * Recortes opcionais. O relatorio roda sem eles ("tudo que o login enxerga");
   * existem para comparar o alcance real do login antes de confiar no recorte.
   */
  area?: number;
  grupoSolucao?: number;
}

export interface ChamadoPesquisa {
  numero: number;
  titulo: string;
  cliente: string;
  cdCliente: number;
  curvaAbc: string | null;
  status: string;
  prioridade: string;
  corPrioridade: string;
  cdCategoria: number;
  /** Data de abertura, "YYYY-MM-DD". */
  data: string;
  /** Hora de abertura, "HH:MM:SS". */
  hora: string;
}

interface PaginaPesquisa {
  chamados: ChamadoPesquisa[];
  total: number;
}

function montarUrl(filtro: FiltroPesquisa, start: number, limit: number): string {
  const p = new URLSearchParams({
    cd_pasta: "8",
    pesq_cd_chamado: "",
    pesq_ds_chamado: "",
    pesq_tp_pesquisa: "0",
    pesq_cd_usuario: "0",
    pesq_cd_tecnico: "0",
    pesq_servico_chamado: "0",
    pesq_tp_tag: "1",
    pesq_categoria_chamado: "0",
    pesq_descricao_categoria_chamado: "",
    pesq_bus_inativos: "false",
    // periodo=0 liga o intervalo customizado; =1 seria um preset da tela.
    pesq_periodo: "0",
    pesq_periodo_ini: formatarBR(filtro.inicio),
    pesq_periodo_fim: formatarBR(filtro.fim),
    pesq_termino_previsto_chamado: "",
    pesq_flag_periodo: "1",
    tp_requisicao: "PES_RESULTADO",
    tp_usuario: "PES",
    cd_area: "0",
    cd_cliente: "0",
    cd_grupo_solucao: "0",
    start: String(start),
    limit: String(limit),
  });

  if (filtro.area !== undefined) p.set("pesq_cd_area", String(filtro.area));
  if (filtro.grupoSolucao !== undefined) {
    p.append("pesq_grupo_solucao_chamado[]", String(filtro.grupoSolucao));
  }
  for (const status of filtro.status ?? []) {
    p.append("pesq_st_chamado[]", status);
  }

  return `/chamado/json?${p.toString()}`;
}

function textoOuNull(valor: unknown): string | null {
  const s = typeof valor === "string" ? valor.trim() : "";
  return s.length > 0 ? s : null;
}

function mapear(item: Record<string, unknown>): ChamadoPesquisa {
  return {
    numero: item.cd_chamado as number,
    titulo: (item.tt_chamado as string) ?? "",
    cliente: (item.nm_cliente as string) ?? "",
    cdCliente: item.cd_cliente as number,
    curvaAbc: textoOuNull(item.curva_abc),
    status: (item.ds_status as string) ?? "",
    prioridade: (item.ds_prioridade as string) ?? "",
    corPrioridade: (item.cor_prioridade as string) ?? "",
    cdCategoria: item.cd_categoria as number,
    data: (item.da_chamado as string) ?? "",
    hora: (item.ha_chamado as string) ?? "",
  };
}

async function buscar(
  sessao: Sessao,
  filtro: FiltroPesquisa,
  start: number,
  limit: number
): Promise<PaginaPesquisa> {
  const res = await sessao.context.get(montarUrl(filtro, start, limit), {
    headers: headersAutenticados(sessao),
  });

  if (!res.ok()) {
    throw new Error(`Falha na pesquisa de chamados: HTTP ${res.status()}`);
  }

  const data = await res.json();

  // A API ja devolveu HTTP 200 com corpo inesperado em outros endpoints deste
  // sistema - conferir o formato antes de confiar no conteudo.
  const lista = (data as Record<string, unknown>)?.lista;
  const total = ((data as Record<string, unknown>)?.treeview as Record<string, unknown>)?.total;

  if (!Array.isArray(lista) || typeof total !== "number") {
    throw new Error('Resposta inesperada da pesquisa: faltam "lista" ou "treeview.total".');
  }

  return { chamados: lista.map(mapear), total };
}

/** Quantos chamados batem com o filtro, sem baixar os registros. */
export async function contarChamados(sessao: Sessao, filtro: FiltroPesquisa): Promise<number> {
  const { total } = await buscar(sessao, filtro, 0, 1);
  return total;
}

/** Uma pagina de resultados, junto do total geral do filtro. */
export async function listarPagina(
  sessao: Sessao,
  filtro: FiltroPesquisa,
  start = 0,
  limit = TAMANHO_DA_PAGINA
): Promise<PaginaPesquisa> {
  return buscar(sessao, filtro, start, limit);
}

/** Todos os chamados do filtro, paginando ate esgotar. */
export async function listarTodos(
  sessao: Sessao,
  filtro: FiltroPesquisa
): Promise<ChamadoPesquisa[]> {
  const chamados: ChamadoPesquisa[] = [];
  let start = 0;

  for (let pagina = 0; pagina < MAXIMO_DE_PAGINAS; pagina++) {
    const atual = await buscar(sessao, filtro, start, TAMANHO_DA_PAGINA);
    chamados.push(...atual.chamados);

    // Para tanto por total quanto por pagina vazia: se a API mentir no total,
    // a pagina vazia evita o loop infinito.
    if (atual.chamados.length === 0 || chamados.length >= atual.total) break;
    start += TAMANHO_DA_PAGINA;
  }

  return chamados;
}
