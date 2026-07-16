import { codigoDoAtendente } from "./atendentes";
import { headersAutenticados, type Sessao } from "./sessao";

/** cd_tipo_atividade = 11 -> "ENC - Encaminhamento de Chamado" (confirmado no dropdown do painel). */
const CODIGO_TIPO_ATIVIDADE_ENCAMINHAMENTO = 11;

function horaAgora(data: Date): string {
  return `${String(data.getHours()).padStart(2, "0")}:${String(data.getMinutes()).padStart(2, "0")}`;
}

function dataAgoraBr(data: Date): string {
  return `${String(data.getDate()).padStart(2, "0")}/${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`;
}

function idAnexoTemporario(): string {
  return "_" + Math.random().toString(36).slice(2, 11);
}

/**
 * Busca o estado atual completo do chamado no mesmo vocabulario de campos
 * que /chamado/salvar/encaminhar espera (campo "configuracao" da resposta -
 * confirmado por captura real, usa cd_prioridade/cd_servico/etc., diferente
 * do vocabulario de /chamado/detalhe/{id}/json).
 */
async function buscarConfiguracaoAtual(sessao: Sessao, numeroChamado: number): Promise<Record<string, unknown>> {
  const res = await sessao.context.post("/chamado/json-formulario", {
    headers: {
      ...headersAutenticados(sessao),
      referer: `https://js.soft4.com.br/chamado/encaminhar/${numeroChamado}`,
    },
    data: {
      acao: "encaminhar",
      cd_atividade_chamado: 0,
      cd_chamado: numeroChamado,
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

  if (!res.ok()) {
    throw new Error(`Falha ao buscar formulario de encaminhamento do chamado ${numeroChamado}: HTTP ${res.status()}`);
  }

  const data = await res.json();
  if (!data.configuracao) {
    throw new Error(`Resposta de json-formulario sem "configuracao" para o chamado ${numeroChamado}.`);
  }
  return data.configuracao as Record<string, unknown>;
}

/**
 * Campos fixos exigidos por /chamado/salvar/encaminhar que nao vem de
 * "configuracao" nem sao especificos do chamado - baseados numa captura
 * real do payload enviado pela propria SPA ao clicar "Salvar" (chamado
 * de exemplo #95419). Majoritariamente flags/campos vazios que nao se
 * aplicam a um encaminhamento simples.
 */
function camposFixos(): Record<string, unknown> {
  return {
    aprovacao: [],
    atendentesComissao: [],
    cd_agendamento_suspensao: 0,
    cd_anexo_chamado_faq: [],
    cd_anexo_chamado: [],
    cd_anexo_temporario: idAnexoTemporario(),
    cd_area_encaminhar: 0,
    cd_atividade_chamado: 0,
    cd_avaliacao: 0,
    cd_chamado_fornecedor_anterior: null,
    cd_chamado_fornecedor: "",
    cd_colaborador: [],
    cd_conceito: {},
    cd_contrato_multiplo_chamado: {},
    cd_contrato: 0,
    cd_ligacao_atividade: 0,
    cd_ligacao: 0,
    cd_motivo_suspensao: 0,
    cd_motivo: 0,
    cd_rankings: {},
    cd_tag: [],
    ds_agendamento: "",
    ds_atividade_chamado: "",
    ds_encaminhamento: "",
    ds_encerramento: "",
    ds_fechamento: "",
    ds_justificativa_solicitacao: "",
    ds_pergunta_faq: "",
    ds_suspensao: "",
    dt_agendamento_tecnico: "",
    dt_agendamento: "",
    dt_encerramento_auto: "",
    dt_finalizacao_fornecedor: "",
    dt_melhoria_fim: "",
    dt_melhoria_inicio: "",
    encerramento_auto_chamados: 0,
    esforco: [],
    fl_cancelar_tarefa: false,
    flag_aprovacao_atendente: 0,
    flag_aprovacao: false,
    flag_cancelar_aprovacao: false,
    flag_cobrar_atividade: false,
    flag_contabilizar_tempo_gasto_pai: false,
    flag_contestacao_improcedente: false,
    flag_encerrar_chamado: false,
    flag_encerrar_chamado_automatico: false,
    flag_enviar_atividade_fornecedor: false,
    flag_acompanhar_chamado_colaborador: false,
    flag_exibir_atendente: false,
    flag_exibir_usuario: false,
    flag_faq_encerrar_chamado: false,
    flag_finalizar_atendimento_fornecedor: false,
    flag_nivel: 0,
    flag_responsavel_chamado_filho: "USU",
    flag_retomar_atendimento: false,
    flag_tipo_hora: 0,
    hr_agendamento_tecnico: "",
    hr_agendamento: "",
    hr_melhoria_previsto: "",
    notificacoes_ic: [],
    notificar_usuario: [],
    nr_sequencia: "",
    redmine: [],
    jira: [],
    tp_cobranca_negociada: 0,
    vl_cobranca_valor_fechado: 0,
    vl_cobranca_valor_hora: 0,
    dt_inicio_emprestimo: "",
    dt_retorno_emprestimo: "",
    cd_motivo_emprestimo: 0,
    ds_local_instalacao: "",
    ds_observacao_emprestimo: "",
    cd_ics_selecionados_emprestimo: [],
    data_ics_emprestados: [],
    is_excluir_emprestimo_ic: false,
    carregou_emprestimo: false,
    previous_route: "https://js.soft4.com.br/chamado",
    cd_atendente_abertura: 0,
    flag_bloquear_cliente: false,
    flag_bloquear_area: false,
    flag_bloquear_solicitante: false,
    flag_bloquear_filial: false,
    flag_bloquear_departamento: false,
    flag_data_abertura_chamado: false,
    qtd_estrelas: 2,
    json_formulario: [],
  };
}

/**
 * Atribui um chamado via chamadas diretas a API do SoftDesk (sem navegador):
 * busca o estado atual do chamado, valida o encaminhamento e so entao salva.
 * Nunca assume sucesso so pelo HTTP 200 - confere a resposta antes.
 */
export async function atribuirChamado(sessao: Sessao, numeroChamado: number, atendente: string): Promise<void> {
  const codigoAtendente = codigoDoAtendente(atendente);
  const configuracaoAtual = await buscarConfiguracaoAtual(sessao, numeroChamado);

  const inicio = new Date();
  const fim = new Date(inicio.getTime() + 60_000);
  const horaInicio = horaAgora(inicio);
  const horaFim = horaAgora(fim);
  const dataAtividade = dataAgoraBr(inicio);
  const referer = `https://js.soft4.com.br/chamado/encaminhar/${numeroChamado}`;

  const dadosChamado = {
    area: configuracaoAtual.cd_area,
    atendente: codigoAtendente,
    categoria: configuracaoAtual.cd_categoria,
    cliente: configuracaoAtual.cd_cliente,
    grupo_solucao: configuracaoAtual.cd_grupo_solucao,
    prioridade: configuracaoAtual.cd_prioridade,
    servico: configuracaoAtual.cd_servico,
    tema_template: 0,
    tp_chamado: configuracaoAtual.cd_tipo_chamado,
    template: 0,
    usuario: configuracaoAtual.cd_usuario,
    filial: configuracaoAtual.cd_filial,
    departamento: configuracaoAtual.cd_departamento,
    data_agendamento: "",
    hora_agendamento: "",
    data_agendamento_tecnico: "",
    hora_agendamento_tecnico: "",
    cd_atividade_chamado: 0,
    data_atividade: dataAtividade,
    hora_atividade_inicio: horaInicio,
    hora_atividade_fim: horaFim,
    tempo_gasto: "00:01",
  };

  const resValidar = await sessao.context.post("/chamado/validar-submit", {
    headers: { ...headersAutenticados(sessao), referer },
    data: {
      acao: "encaminhar",
      cd_chamado: numeroChamado,
      cd_chamados: [numeroChamado],
      flag_retomar_atendimento: false,
      flag_finalizar_atendimento_fornecedor: false,
      fl_ignorar_avaliacao: false,
      dados_chamado: dadosChamado,
      itens_validados: [],
    },
  });

  if (!resValidar.ok()) {
    throw new Error(`Validacao do encaminhamento falhou para o chamado ${numeroChamado}: HTTP ${resValidar.status()}`);
  }

  const acompanhar = atendente === "Felipe Prado";

  const payload = {
    acao: "encaminhar",
    ...camposFixos(),
    ...configuracaoAtual,
    cd_chamado: numeroChamado,
    cd_chamados: [numeroChamado],
    id_chamado: String(numeroChamado),
    cd_atendente: codigoAtendente,
    cd_tipo_atividade: CODIGO_TIPO_ATIVIDADE_ENCAMINHAMENTO,
    tempo_gasto: "00:01",
    fl_exibir_atividade: false,
    flag_acompanhar: acompanhar,
    dt_atividade_chamado: dataAtividade,
    hr_atividade_chamado: horaFim,
    hr_inicio_atividade_chamado: horaInicio,
  };

  const resSalvar = await sessao.context.post("/chamado/salvar/encaminhar", {
    headers: { ...headersAutenticados(sessao), referer },
    data: payload,
  });

  if (!resSalvar.ok()) {
    throw new Error(`Falha ao salvar encaminhamento do chamado ${numeroChamado}: HTTP ${resSalvar.status()}`);
  }
}
