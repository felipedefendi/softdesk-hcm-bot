import type { Page } from "playwright";
import { tempoDecorridoEmMinutos } from "./sla";

export interface Chamado {
  numero: number;
  titulo: string;
  cliente: string;
  cdServico: number;
  cdGrupoSolucao: number;
  criadoEm: Date;
}

const LISTA_SEM_ATENDENTE_URL =
  "https://js.soft4.com.br/chamado/json?cd_area=0&cd_cliente=0&cd_grupo_solucao=0&cd_pasta=13" +
  "&has_interaction=false&st_chamado=1&total=0&tp_requisicao=SEM_ATENDENTE&tp_usuario=ATE&text=Sem+atendente";

async function obterTokenCsrf(page: Page): Promise<string> {
  await page.waitForLoadState("networkidle").catch(() => {});

  const lerToken = () =>
    page.evaluate(() => {
      const meta = document.querySelector('meta[name="csrf-token"]');
      return meta ? meta.getAttribute("content") : null;
    });

  let token: string | null;
  try {
    token = await lerToken();
  } catch {
    // A pagina pode estar no meio de uma navegacao interna do SPA; tenta de novo apos estabilizar.
    await page.waitForLoadState("networkidle").catch(() => {});
    token = await lerToken();
  }

  if (!token) {
    throw new Error("Nao foi possivel encontrar o token CSRF na pagina (meta[name=csrf-token]).");
  }
  return token;
}

/**
 * Lista os chamados na fila "Sem atendente" chamando a API JSON diretamente
 * (mesma chamada que o front-end do SoftDesk faz ao clicar na aba), ordenados
 * do mais antigo para o mais novo (mais antigo = prioridade de atendimento).
 */
export async function listarChamadosSemAtendente(page: Page): Promise<Chamado[]> {
  const res = await page.request.get(LISTA_SEM_ATENDENTE_URL);
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

/** Busca o SLA do chamado (endpoint real: POST /chamado/detalhe/{id}/json) e retorna minutos de Encaminhamento. */
export async function buscarMinutosEncaminhamento(page: Page, numeroChamado: number): Promise<number> {
  const token = await obterTokenCsrf(page);

  const res = await page.request.post(`https://js.soft4.com.br/chamado/detalhe/${numeroChamado}/json`, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "X-CSRF-TOKEN": token,
      Accept: "application/json",
    },
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

  const data = await res.json();

  const sla = (data.sla?.sla ?? []) as Array<{ nome: string; decorrido: string }>;
  const encaminhamento = sla.find((s) => s.nome === "Encaminhamento");
  if (!encaminhamento) {
    throw new Error(`SLA de "Encaminhamento" nao encontrado no chamado ${numeroChamado}`);
  }

  return tempoDecorridoEmMinutos(encaminhamento.decorrido);
}
