import { abrirSessao, encerrarSessao, headersAutenticados } from "./sessao";
import { listarAtendentes } from "./atendentes";
import { config } from "./config";

/**
 * Lista os atendentes do SoftDesk com o codigo (cd_atendente) que o bot usa
 * pra encaminhar - o numero pedido em "Usuario atendente" na tela de Usuarios.
 * So leitura.
 *
 * A fonte e o formulario da tela de pesquisa de chamados, que traz todos os
 * atendentes sem depender de chamado aberto. Atencao: o SoftDesk devolve ali o
 * cadastro inteiro de cada atendente (inclusive senha e tokens). Aqui so codigo,
 * nome, grupo e status sao lidos - o resto nunca e impresso nem guardado.
 *
 * Na VM: cd ~/softdesk-hcm-bot && node dist/listar-atendentes-softdesk.js
 */
interface AtendenteSoftDesk {
  codigo: number;
  nome: string;
  grupo: string;
  ativo: boolean;
}

async function buscarAtendentes(): Promise<AtendenteSoftDesk[]> {
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
    return (dados.atendente ?? []).map((a) => ({
      codigo: Number(a.cd_atendente),
      nome: String(a.nm_atendente ?? ""),
      grupo: String(a.ds_grupo_solucao ?? "-"),
      ativo: Number(a.st_atendente) === 1,
    }));
  } finally {
    await encerrarSessao(sessao);
  }
}

async function main(): Promise<void> {
  const atendentes = await buscarAtendentes();
  if (atendentes.length === 0) {
    console.log("O SoftDesk devolveu a lista de atendentes vazia.");
    process.exitCode = 1;
    return;
  }

  // Por nome, nao por grupo: o SoftDesk manda um grupo so por pessoa, mesmo pra
  // quem esta em varios (quem atende HCM pode aparecer como "Suprimentos").
  atendentes.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const noRodizio = new Map(listarAtendentes().map((a) => [a.codigoAtendente, a]));
  console.log(`${atendentes.length} atendentes no SoftDesk:\n`);
  console.log("Codigo  Nome                            Rodizio         Um dos grupos de solucao");
  for (const a of atendentes) {
    const local = noRodizio.get(a.codigo);
    const rodizio = local ? (local.ativo ? "sim" : "sim (inativo)") : "-";
    const status = a.ativo ? "" : "  [inativo no SoftDesk]";
    console.log(`${String(a.codigo).padEnd(8)}${a.nome.padEnd(32)}${rodizio.padEnd(16)}${a.grupo}${status}`);
  }
}

main().catch((err) => {
  console.error("Erro:", err instanceof Error ? err.message : err);
  process.exit(1);
});
