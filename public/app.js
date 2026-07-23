const telaLogin = document.getElementById("tela-login");
const telaDashboard = document.getElementById("tela-dashboard");

async function api(caminho, opcoes) {
  const res = await fetch(`/api${caminho}`, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });
  if (res.status === 401) {
    mostrarLogin();
    throw new Error("Nao autenticado");
  }
  if (!res.ok) {
    const corpo = await res.json().catch(() => ({}));
    throw new Error(corpo.erro || `Erro HTTP ${res.status}`);
  }
  return res.json();
}

function mostrarLogin() {
  telaLogin.classList.remove("oculto");
  telaDashboard.classList.add("oculto");
}

function mostrarDashboard() {
  telaLogin.classList.add("oculto");
  telaDashboard.classList.remove("oculto");
  carregarTudo();
}

document.getElementById("form-login").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const senha = document.getElementById("senha").value;
  const erroEl = document.getElementById("erro-login");
  erroEl.textContent = "";

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    if (!res.ok) {
      const corpo = await res.json().catch(() => ({}));
      erroEl.textContent = corpo.erro || "Falha no login";
      return;
    }
    mostrarDashboard();
  } catch {
    erroEl.textContent = "Falha ao conectar no servidor";
  }
});

document.getElementById("btn-logout").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  mostrarLogin();
});

function formatarData(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR");
}

async function carregarStatus() {
  const status = await api("/status");
  document.getElementById("stat-ultima-execucao").textContent = formatarData(status.ultimaExecucao);
  document.getElementById("stat-proxima-execucao").textContent = formatarData(status.proximaExecucaoPrevista);
  document.getElementById("stat-processados").textContent = status.chamadosProcessadosUltimaExecucao;
  document.getElementById("status-erro").textContent = status.ultimoErro ? `Ultimo erro: ${status.ultimoErro}` : "";
}

async function carregarAutomacao() {
  const { ativa } = await api("/automacao");
  const chip = document.getElementById("chip-automacao");
  chip.textContent = ativa ? "Ativo" : "Pausado";
  chip.classList.toggle("chip-ativo", ativa);
  chip.classList.toggle("chip-inativo", !ativa);

  document.getElementById("toggle-automacao").checked = ativa;
  document.getElementById("toggle-automacao-rotulo").textContent = ativa ? "Automação ativa" : "Automação pausada";
}

document.getElementById("toggle-automacao").addEventListener("change", async (ev) => {
  const ligar = ev.target.checked;
  ev.target.disabled = true;
  try {
    await api(ligar ? "/automacao/retomar" : "/automacao/pausar", { method: "POST" });
  } catch (err) {
    alert(err.message);
  } finally {
    ev.target.disabled = false;
    await carregarAutomacao();
  }
});

async function carregarRotation() {
  try {
    const rotation = await api("/rotation");
    document.getElementById("rodizio-proximo").textContent = rotation.proximo;
  } catch {
    document.getElementById("rodizio-proximo").textContent = "indisponivel";
  }
}

let linhaArrastada = null;

/** Persiste a ordem atual das linhas. Usado tanto pelo arrastar quanto pelas setas. */
async function salvarOrdemAtual() {
  const novaOrdem = [...document.querySelectorAll("#tabela-atendentes tbody tr")].map((r) => r.dataset.nome);
  try {
    await api("/atendentes/ordem", { method: "PUT", body: JSON.stringify({ ordem: novaOrdem }) });
    await carregarRotation();
  } catch (err) {
    alert(err.message);
    await carregarAtendentes();
  }
}

/** Desabilita a seta de subir na primeira linha e a de descer na ultima. */
function atualizarBotoesMover() {
  const linhas = [...document.querySelectorAll("#tabela-atendentes tbody tr")];
  linhas.forEach((tr, i) => {
    const sobe = tr.querySelector(".botao-mover-sobe");
    const desce = tr.querySelector(".botao-mover-desce");
    if (sobe) sobe.disabled = i === 0;
    if (desce) desce.disabled = i === linhas.length - 1;
  });
}

async function moverAtendente(tr, direcao) {
  const tbody = tr.parentElement;

  if (direcao < 0) {
    const anterior = tr.previousElementSibling;
    if (!anterior) return;
    tbody.insertBefore(tr, anterior);
  } else {
    const proximo = tr.nextElementSibling;
    if (!proximo) return;
    tbody.insertBefore(proximo, tr);
  }

  atualizarBotoesMover();
  await salvarOrdemAtual();
}

function tornarArrastavel(tr, nome) {
  tr.dataset.nome = nome;

  const tdHandle = document.createElement("td");
  tdHandle.className = "handle-arrastar";

  const alca = document.createElement("span");
  alca.className = "alca-drag";
  alca.textContent = "⠿";
  alca.title = "Arraste para reordenar o rodizio";
  alca.addEventListener("mousedown", () => {
    tr.draggable = true;
  });

  // O drag-and-drop nativo do HTML5 nao responde a toque, entao no celular a
  // reordenacao e feita por estas setas (mesmo endpoint do arrastar).
  const btnSobe = document.createElement("button");
  btnSobe.className = "botao-mover botao-mover-sobe";
  btnSobe.textContent = "▲";
  btnSobe.title = "Subir no rodizio";
  btnSobe.addEventListener("click", () => moverAtendente(tr, -1));

  const btnDesce = document.createElement("button");
  btnDesce.className = "botao-mover botao-mover-desce";
  btnDesce.textContent = "▼";
  btnDesce.title = "Descer no rodizio";
  btnDesce.addEventListener("click", () => moverAtendente(tr, 1));

  tdHandle.append(alca, btnSobe, btnDesce);

  tr.addEventListener("dragstart", () => {
    linhaArrastada = tr;
    tr.classList.add("arrastando");
  });

  tr.addEventListener("dragend", async () => {
    tr.draggable = false;
    tr.classList.remove("arrastando");
    linhaArrastada = null;

    atualizarBotoesMover();
    await salvarOrdemAtual();
  });

  return tdHandle;
}

const tbodyAtendentes = document.querySelector("#tabela-atendentes tbody");
tbodyAtendentes.addEventListener("dragover", (ev) => {
  if (!linhaArrastada) return;
  ev.preventDefault();

  const alvo = ev.target.closest("tr");
  if (!alvo || alvo === linhaArrastada) return;

  const rect = alvo.getBoundingClientRect();
  const antes = ev.clientY - rect.top < rect.height / 2;
  tbodyAtendentes.insertBefore(linhaArrastada, antes ? alvo : alvo.nextSibling);
});

async function carregarAtendentes() {
  const atendentes = await api("/atendentes");
  const tbody = document.querySelector("#tabela-atendentes tbody");
  tbody.innerHTML = "";

  const select = document.getElementById("rodizio-select");
  select.innerHTML = "";
  for (const a of atendentes) {
    if (!a.ativo) continue;
    const option = document.createElement("option");
    option.value = a.nome;
    option.textContent = a.nome;
    select.appendChild(option);
  }

  for (const a of atendentes) {
    const tr = document.createElement("tr");
    tr.appendChild(tornarArrastavel(tr, a.nome));

    // data-rotulo alimenta o rotulo de cada campo no layout mobile (ver style.css),
    // onde a tabela vira um cartao empilhado e o cabecalho some.
    const tdNome = document.createElement("td");
    tdNome.dataset.rotulo = "Nome";
    tdNome.textContent = a.nome;

    const tdStatus = document.createElement("td");
    tdStatus.dataset.rotulo = "Status";
    const badge = document.createElement("span");
    badge.className = `badge ${a.ativo ? "badge-ativo" : "badge-inativo"}`;
    badge.textContent = a.ativo ? "Ativo" : "Inativo";
    tdStatus.appendChild(badge);

    const tdMotivo = document.createElement("td");
    tdMotivo.dataset.rotulo = "Motivo";
    tdMotivo.textContent = a.motivoInatividade || "-";

    const tdRetorno = document.createElement("td");
    tdRetorno.dataset.rotulo = "Retorna em";
    tdRetorno.textContent = a.retornaEm || "-";

    const tdAcao = document.createElement("td");
    tdAcao.dataset.rotulo = "Ação";
    if (a.ativo) {
      const wrapAcao = document.createElement("div");
      wrapAcao.className = "acao-atendente";

      const btnAbrir = document.createElement("button");
      btnAbrir.textContent = "Desativar";
      btnAbrir.className = "botao-secundario btn-desativar-abrir";

      const painel = document.createElement("div");
      painel.className = "linha-acao linha-acao-painel";

      const inputMotivo = document.createElement("input");
      inputMotivo.placeholder = "Motivo (ferias, falta...)";
      inputMotivo.className = "input-motivo";

      const inputData = document.createElement("input");
      inputData.type = "date";

      const btnConfirmar = document.createElement("button");
      btnConfirmar.textContent = "Confirmar";

      const btnCancelar = document.createElement("button");
      btnCancelar.textContent = "Cancelar";
      btnCancelar.className = "botao-secundario";

      btnAbrir.addEventListener("click", () => {
        wrapAcao.classList.add("aberto");
        inputMotivo.focus();
      });

      btnCancelar.addEventListener("click", () => {
        wrapAcao.classList.remove("aberto");
      });

      btnConfirmar.addEventListener("click", async () => {
        btnConfirmar.disabled = true;
        try {
          await api(`/atendentes/${encodeURIComponent(a.nome)}`, {
            method: "PATCH",
            body: JSON.stringify({
              ativo: false,
              motivo: inputMotivo.value || "Nao informado",
              retornaEm: inputData.value || null,
            }),
          });
          await Promise.all([carregarAtendentes(), carregarRotation()]);
        } catch (err) {
          alert(err.message);
          btnConfirmar.disabled = false;
        }
      });

      painel.append(inputMotivo, inputData, btnConfirmar, btnCancelar);
      wrapAcao.append(btnAbrir, painel);
      tdAcao.appendChild(wrapAcao);
    } else {
      const btn = document.createElement("button");
      btn.textContent = "Reativar agora";
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          await api(`/atendentes/${encodeURIComponent(a.nome)}`, {
            method: "PATCH",
            body: JSON.stringify({ ativo: true }),
          });
          await Promise.all([carregarAtendentes(), carregarRotation()]);
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      });
      tdAcao.appendChild(btn);
    }

    tr.append(tdNome, tdStatus, tdMotivo, tdRetorno, tdAcao);
    tbody.appendChild(tr);
  }

  atualizarBotoesMover();
}

async function carregarConfiguracoes() {
  const cfg = await api("/configuracoes");
  document.getElementById("cfg-intervalo").value = cfg.pollIntervalMinutes;
  document.getElementById("cfg-limite").value = cfg.encaminhamentoLimiteMinutos;
  document.getElementById("cfg-dias-alerta").value = cfg.diasSemReceberParaAlerta;
}

document.getElementById("form-config").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const pollIntervalMinutes = Number(document.getElementById("cfg-intervalo").value);
  const encaminhamentoLimiteMinutos = Number(document.getElementById("cfg-limite").value);
  const diasSemReceberParaAlerta = Number(document.getElementById("cfg-dias-alerta").value);

  await api("/configuracoes", {
    method: "PATCH",
    body: JSON.stringify({ pollIntervalMinutes, encaminhamentoLimiteMinutos, diasSemReceberParaAlerta }),
  });
  alert("Configuracoes salvas. Valem a partir do proximo ciclo do bot.");
});

// Alerta de rodizio travado: so aparece quando ha atendente ativo ha muito tempo
// sem receber. Nao e ranking - nao mostra quantos cada um recebeu, so ha quanto
// tempo o rodizio nao chega nele. Diagnostico de defeito, nunca vai pro Teams.
async function carregarAlertaRodizio() {
  const { limite, atendentes } = await api("/alerta-rodizio");
  const cartao = document.getElementById("alerta-rodizio");
  const lista = document.getElementById("alerta-rodizio-lista");
  lista.innerHTML = "";

  if (atendentes.length === 0) {
    cartao.classList.add("oculto");
    return;
  }

  document.getElementById("alerta-rodizio-texto").textContent =
    `Atendente(s) ativo(s) sem receber chamado há ${limite}+ dias úteis. Vale conferir se o rodízio está funcionando.`;

  for (const a of atendentes) {
    const li = document.createElement("li");
    const quando =
      a.diasUteis === null
        ? "nunca recebeu um chamado pelo rodízio"
        : `sem receber há ${a.diasUteis} dias úteis`;
    li.textContent = `${a.atendente} — ${quando}`;
    lista.appendChild(li);
  }

  cartao.classList.remove("oculto");
}

let qtdLogVisiveis = 50;

async function carregarLog() {
  const entradas = await api("/log");
  const tbody = document.querySelector("#tabela-log tbody");
  tbody.innerHTML = "";

  for (const e of entradas.slice(0, qtdLogVisiveis)) {
    const tr = document.createElement("tr");
    if (e.chamado === null) {
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = e.linhaOriginal;
      tr.appendChild(td);
    } else {
      const rotulos = ["Horário", "Chamado", "Cliente / Título", "Atendente"];
      [e.horario, `#${e.chamado}`, e.clienteETitulo, e.atendente].forEach((valor, i) => {
        const td = document.createElement("td");
        td.dataset.rotulo = rotulos[i];
        td.textContent = valor;
        tr.appendChild(td);
      });
    }
    tbody.appendChild(tr);
  }

  document.getElementById("btn-carregar-mais-log").classList.toggle("oculto", entradas.length <= qtdLogVisiveis);
}

document.getElementById("btn-carregar-mais-log").addEventListener("click", () => {
  qtdLogVisiveis += 50;
  carregarLog();
});

document.getElementById("btn-definir-proximo").addEventListener("click", async () => {
  const select = document.getElementById("rodizio-select");
  const resultadoEl = document.getElementById("rodizio-resultado");
  const nome = select.value;
  if (!nome) return;

  try {
    await api("/rotation/proximo", { method: "POST", body: JSON.stringify({ nome }) });
    resultadoEl.textContent = "";
    await carregarRotation();
  } catch (err) {
    resultadoEl.textContent = `Erro: ${err.message}`;
  }
});

document.getElementById("btn-verificar-agora").addEventListener("click", async () => {
  const btn = document.getElementById("btn-verificar-agora");
  const resultadoEl = document.getElementById("verificar-resultado");
  btn.disabled = true;
  resultadoEl.textContent = "Verificando...";

  try {
    const resultado = await api("/verificar-agora", { method: "POST" });
    resultadoEl.textContent = `Concluido: ${resultado.processados} chamado(s) processado(s).`;
    await carregarTudo();
  } catch (err) {
    resultadoEl.textContent = `Erro: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});

// Evita sobrescrever um campo que o usuario esta editando no momento do refresh automatico.
function usuarioEditandoDentroDe(seletor) {
  return document.activeElement?.closest(seletor) != null;
}

async function carregarTudo() {
  const tarefas = [carregarStatus(), carregarAutomacao(), carregarRotation(), carregarLog(), carregarAlertaRodizio()];
  if (!usuarioEditandoDentroDe("#tabela-atendentes")) tarefas.push(carregarAtendentes());
  if (!usuarioEditandoDentroDe("#form-config")) tarefas.push(carregarConfiguracoes());
  await Promise.all(tarefas);
}

// Atualizacao automatica: outros colaboradores com o dashboard aberto ao
// mesmo tempo veem mudancas (feitas por outra pessoa ou pelo proprio bot)
// sem precisar recarregar a pagina manualmente.
setInterval(() => {
  if (!telaDashboard.classList.contains("oculto")) {
    carregarTudo().catch(() => {});
  }
}, 15000);

(async function iniciar() {
  try {
    await api("/status");
    mostrarDashboard();
  } catch {
    mostrarLogin();
  }
})();
