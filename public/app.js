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
  document.getElementById("status-conteudo").innerHTML = `
    <p>Ultima execucao: ${formatarData(status.ultimaExecucao)}</p>
    <p>Proxima execucao prevista: ${formatarData(status.proximaExecucaoPrevista)}</p>
    <p>Chamados processados na ultima execucao: ${status.chamadosProcessadosUltimaExecucao}</p>
    ${status.ultimoErro ? `<p class="erro">Ultimo erro: ${status.ultimoErro}</p>` : ""}
  `;
}

async function carregarRotation() {
  try {
    const rotation = await api("/rotation");
    document.getElementById("rodizio-proximo").textContent = rotation.proximo;
  } catch {
    document.getElementById("rodizio-proximo").textContent = "indisponivel";
  }
}

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

    const tdNome = document.createElement("td");
    tdNome.textContent = a.nome;

    const tdStatus = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `badge ${a.ativo ? "badge-ativo" : "badge-inativo"}`;
    badge.textContent = a.ativo ? "Ativo" : "Inativo";
    tdStatus.appendChild(badge);

    const tdMotivo = document.createElement("td");
    tdMotivo.textContent = a.motivoInatividade || "-";

    const tdRetorno = document.createElement("td");
    tdRetorno.textContent = a.retornaEm || "-";

    const tdAcao = document.createElement("td");
    if (a.ativo) {
      const linha = document.createElement("div");
      linha.className = "linha-acao";

      const inputMotivo = document.createElement("input");
      inputMotivo.placeholder = "Motivo (ferias, falta...)";
      inputMotivo.style.width = "160px";

      const inputData = document.createElement("input");
      inputData.type = "date";

      const btn = document.createElement("button");
      btn.textContent = "Desativar";
      btn.addEventListener("click", async () => {
        btn.disabled = true;
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
          btn.disabled = false;
        }
      });

      linha.append(inputMotivo, inputData, btn);
      tdAcao.appendChild(linha);
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
}

async function carregarConfiguracoes() {
  const cfg = await api("/configuracoes");
  document.getElementById("cfg-intervalo").value = cfg.pollIntervalMinutes;
  document.getElementById("cfg-limite").value = cfg.encaminhamentoLimiteMinutos;
}

document.getElementById("form-config").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const pollIntervalMinutes = Number(document.getElementById("cfg-intervalo").value);
  const encaminhamentoLimiteMinutos = Number(document.getElementById("cfg-limite").value);

  await api("/configuracoes", {
    method: "PATCH",
    body: JSON.stringify({ pollIntervalMinutes, encaminhamentoLimiteMinutos }),
  });
  alert("Configuracoes salvas. Valem a partir do proximo ciclo do bot.");
});

async function carregarLog() {
  const entradas = await api("/log");
  const tbody = document.querySelector("#tabela-log tbody");
  tbody.innerHTML = "";

  for (const e of entradas.slice(0, 50)) {
    const tr = document.createElement("tr");
    if (e.chamado === null) {
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = e.linhaOriginal;
      tr.appendChild(td);
    } else {
      for (const valor of [e.horario, `#${e.chamado}`, e.clienteETitulo, e.atendente]) {
        const td = document.createElement("td");
        td.textContent = valor;
        tr.appendChild(td);
      }
    }
    tbody.appendChild(tr);
  }
}

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

async function carregarTudo() {
  await Promise.all([
    carregarStatus(),
    carregarRotation(),
    carregarAtendentes(),
    carregarConfiguracoes(),
    carregarLog(),
  ]);
}

(async function iniciar() {
  try {
    await api("/status");
    mostrarDashboard();
  } catch {
    mostrarLogin();
  }
})();
