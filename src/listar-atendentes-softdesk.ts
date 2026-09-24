import { abrirSessao, encerrarSessao, headersAutenticados } from "./sessao";
import { listarChamadosSemAtendente } from "./tickets";
import { listarAtendentes } from "./atendentes";
import { config } from "./config";

/**
 * Lista os atendentes do SoftDesk com o codigo (cd_atendente) que o bot usa
 * pra encaminhar - o numero pedido em "Usuario atendente" na tela de Usuarios.
 * So leitura: nao encaminha nada.
 *
 * O SoftDesk nao tem endpoint de "lista de atendentes" pra este login. A lista
 * sai do mesmo formulario que o bot usa pra encaminhar (json-formulario), que
 * so vem preenchido pra um chamado aberto - e traz os atendentes do grupo de
 * solucao dele (HCM). Sem chamado em "Sem atendente", nao ha como listar.
 *
 * Na VM: cd ~/softdesk-hcm-bot && node dist/listar-atendentes-softdesk.js
 */
async function main(): Promise<void> {
  const sessao = await abrirSessao();
  try {
    const abertos = await listarChamadosSemAtendente(sessao);
    if (abertos.length === 0) {
      console.log('Nenhum chamado em "Sem atendente" agora - o SoftDesk so devolve a lista com um chamado aberto. Tente mais tarde.');
      process.exitCode = 1;
      return;
    }

    const numero = abertos[0].numero;
    // Mesmos campos que o assign.ts pede: com um subconjunto menor o SoftDesk
    // devolve a lista de atendentes vazia.
    const res = await sessao.context.post("/chamado/json-formulario", {
      headers: { ...headersAutenticados(sessao), referer: `${config.softdeskUrl}/encaminhar/${numero}` },
      data: {
        acao: "encaminhar",
        cd_atividade_chamado: 0,
        cd_chamado: numero,
        cd_departamento_selecionado: 3,
        cd_ligacao: 0,
        flag_inicializar_usuario: true,
        ref: "mounted",
        campos: [
          "chamado", "cliente", "area", "filial", "departamento", "usuario", "usuario_chave",
          "campo_customizavel", "prioridade", "nivel_indisponibilidade", "servico", "tag",
          "template_chamado", "template_chamado_tema", "tipo_chamado", "grupo_solucao",
          "atendente", "item_conf", "versao", "tipo_atividade", "fornecedor", "configuracao", "geral",
        ],
      },
    });
    if (!res.ok()) throw new Error(`json-formulario respondeu HTTP ${res.status()}`);

    const dados = (await res.json()) as {
      atendente?: Array<{ cd_atendente: number; nm_atendente: string; flag_impedimento: number }>;
      grupo_solucao?: Array<{ ds_grupo_solucao: string }>;
    };
    const lista = [...(dados.atendente ?? [])].sort((a, b) => a.nm_atendente.localeCompare(b.nm_atendente, "pt-BR"));
    if (lista.length === 0) {
      console.log(`O SoftDesk devolveu a lista vazia para o chamado ${numero}.`);
      process.exitCode = 1;
      return;
    }

    const noRodizio = new Map(listarAtendentes().map((a) => [a.codigoAtendente, a]));
    const grupo = dados.grupo_solucao?.[0]?.ds_grupo_solucao ?? "?";
    console.log(`Atendentes do grupo "${grupo}" no SoftDesk (lidos do chamado ${numero}):\n`);
    console.log("Codigo  Nome                            No rodizio do bot");
    for (const a of lista) {
      const local = noRodizio.get(a.cd_atendente);
      const situacao = local ? (local.ativo ? "sim" : "sim (inativo)") : "-";
      const impedido = a.flag_impedimento ? "  [impedido no SoftDesk]" : "";
      console.log(`${String(a.cd_atendente).padEnd(8)}${a.nm_atendente.padEnd(32)}${situacao}${impedido}`);
    }
  } finally {
    await encerrarSessao(sessao);
  }
}

main().catch((err) => {
  console.error("Erro:", err instanceof Error ? err.message : err);
  process.exit(1);
});
