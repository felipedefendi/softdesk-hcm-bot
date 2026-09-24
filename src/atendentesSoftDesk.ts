import { abrirSessao, encerrarSessao, headersAutenticados } from "./sessao";
import { config } from "./config";

/**
 * Atendentes cadastrados no SoftDesk, com o codigo (cd_atendente) que o bot
 * usa pra encaminhar. Serve a lista de "Usuario atendente" na tela de Usuarios
 * e o script listar-atendentes-softdesk.
 *
 * A fonte e o formulario da tela de pesquisa de chamados, que traz todos os
 * atendentes sem depender de chamado aberto. Atencao: o SoftDesk devolve ali o
 * cadastro inteiro de cada atendente (inclusive senha e tokens). Aqui so codigo,
 * nome, grupo e status sao lidos - o resto nunca e guardado nem repassado.
 */
export interface AtendenteSoftDesk {
  codigo: number;
  nome: string;
  /** Um dos grupos de solucao: o SoftDesk manda um so, mesmo pra quem esta em varios. */
  grupo: string;
  ativo: boolean;
}

export async function buscarAtendentesSoftDesk(): Promise<AtendenteSoftDesk[]> {
  const sessao = await abrirSessao();
  try {
    const res = await sessao.context.post("/chamado/json-formulario/pesquisa", {
      headers: { ...headersAutenticados(sessao), referer: config.softdeskUrl },
      data: {
        ref: "mounted",
        cd_area: 0,
        cd_cliente: [],
        flag_exibir_inativos: false,
        flag_listar_todos_clientes: true,
        flag_listar_todas_filiais: true,
        // Mesmos campos que a tela pede. So com "atendente" o SoftDesk devolve
        // outra lista (com contas de sistema e sem o grupo de solucao).
        campos: [
          "area", "atendente", "cliente", "grupo_solucao", "prioridade", "servico", "tag", "tipo_chamado",
          "usuario", "versao", "projeto", "status_chamado", "fornecedor", "departamento", "filial",
          "pesquisa_nr_filtros", "geral",
        ],
      },
    });
    if (!res.ok()) throw new Error(`json-formulario/pesquisa respondeu HTTP ${res.status()}`);

    const dados = (await res.json()) as { atendente?: Array<Record<string, unknown>> };
    return (dados.atendente ?? [])
      .map((a) => ({
        codigo: Number(a.cd_atendente),
        nome: String(a.nm_atendente ?? ""),
        grupo: String(a.ds_grupo_solucao ?? "-"),
        ativo: Number(a.st_atendente) === 1,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  } finally {
    await encerrarSessao(sessao);
  }
}
