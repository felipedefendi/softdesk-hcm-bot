// Cofre de senhas de clientes. Depende do app.js ja ter rodado (reusa a tela
// de login/logout e a funcao mostrarLogin ao detectar 401). Metadados exigem
// so o login normal do painel; revelar exige um segundo destrave (mesma
// senha do painel, janela de 5 min) - ver src/dashboard/cofreRotas.ts.

const TEMPO_EXPOSICAO_MS = 20 * 1000;

let sistemasCache = [];
let credenciaisCache = [];
let destravadoAte = 0;
let linhaRevelada = null; // { id, painelTr, timeoutRemask }
let resolverDestrave = null;

async function apiCofre(caminho, opcoes) {
  const res = await fetch(`/api/cofre${caminho}`, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });
  if (res.status === 401) {
    mostrarLogin();
    throw new Error("Nao autenticado");
  }
  if (res.status === 423) {
    destravadoAte = 0;
    const erro = new Error("Cofre travado");
    erro.cofreTravado = true;
    throw erro;
  }
  if (!res.ok) {
    const corpo = await res.json().catch(() => ({}));
    throw new Error(corpo.erro || `Erro HTTP ${res.status}`);
  }
  return res.json();
}

function estaDestravado() {
  return destravadoAte > Date.now();
}

function atualizarChipTrava() {
  const chip = document.getElementById("cofre-chip-trava");
  const destravado = estaDestravado();
  chip.textContent = destravado ? "Destravado" : "Travado";
  chip.classList.toggle("chip-ativo", destravado);
  chip.classList.toggle("chip-inativo", !destravado);
  document.getElementById("btn-cofre-trancar").classList.toggle("oculto", !destravado);
}

// --- Destrave ---

const modalDestravar = document.getElementById("modal-cofre-destravar");

function pedirDestrave() {
  return new Promise((resolve) => {
    resolverDestrave = resolve;
    document.getElementById("cofre-destravar-senha").value = "";
    document.getElementById("cofre-destravar-erro").textContent = "";
    modalDestravar.classList.remove("oculto");
    document.getElementById("cofre-destravar-senha").focus();
  });
}

function fecharModalDestravar(sucesso) {
  modalDestravar.classList.add("oculto");
  if (resolverDestrave) {
    resolverDestrave(sucesso);
    resolverDestrave = null;
  }
}

document.getElementById("btn-cofre-destravar-cancelar").addEventListener("click", () => fecharModalDestravar(false));

document.getElementById("form-cofre-destravar").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const senha = document.getElementById("cofre-destravar-senha").value;
  const erroEl = document.getElementById("cofre-destravar-erro");
  try {
    await apiCofre("/destravar", { method: "POST", body: JSON.stringify({ senha }) });
    destravadoAte = Date.now() + 5 * 60 * 1000;
    atualizarChipTrava();
    fecharModalDestravar(true);
  } catch (err) {
    erroEl.textContent = err.message;
  }
});

/** Garante que o cofre esta destravado, pedindo a senha se preciso. Resolve false se o usuario cancelar. */
async function garantirDestrave() {
  if (estaDestravado()) return true;
  return pedirDestrave();
}

document.getElementById("btn-cofre-trancar").addEventListener("click", async () => {
  await apiCofre("/trancar", { method: "POST" }).catch(() => {});
  destravadoAte = 0;
  atualizarChipTrava();
  fecharLinhaRevelada();
});

// --- Sistemas ---

function nomeSistema(id) {
  return sistemasCache.find((s) => s.id === id)?.nome || "Sistema removido";
}

async function carregarSistemas() {
  sistemasCache = await apiCofre("/sistemas");
}

function preencherSelectSistemas(selecionadoId) {
  const select = document.getElementById("cofre-sistema");
  select.innerHTML = "";
  for (const s of sistemasCache) {
    if (!s.ativo && s.id !== selecionadoId) continue;
    const option = document.createElement("option");
    option.value = s.id;
    option.textContent = s.nome;
    select.appendChild(option);
  }
  if (selecionadoId) select.value = selecionadoId;
}

const modalSistemas = document.getElementById("modal-cofre-sistemas");

function renderListaSistemas() {
  const lista = document.getElementById("lista-cofre-sistemas");
  lista.innerHTML = "";

  for (const s of sistemasCache) {
    const li = document.createElement("li");
    li.className = "cofre-sistema-item";

    const nome = document.createElement("span");
    nome.textContent = s.nome;
    if (!s.ativo) nome.className = "texto-fraco";

    const btn = document.createElement("button");
    btn.className = "botao-secundario";
    btn.type = "button";
    btn.textContent = s.ativo ? "Desativar" : "Reativar";
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        sistemasCache = await apiCofre(`/sistemas/${s.id}/${s.ativo ? "desativar" : "reativar"}`, { method: "POST" });
        renderListaSistemas();
        renderCofreTabela();
      } catch (err) {
        document.getElementById("cofre-sistemas-erro").textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });

    li.append(nome, btn);
    lista.appendChild(li);
  }
}

document.getElementById("btn-cofre-sistemas").addEventListener("click", () => {
  document.getElementById("cofre-sistemas-erro").textContent = "";
  renderListaSistemas();
  modalSistemas.classList.remove("oculto");
});

document.getElementById("btn-cofre-sistemas-fechar").addEventListener("click", () => {
  modalSistemas.classList.add("oculto");
});

document.getElementById("form-cofre-novo-sistema").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const input = document.getElementById("cofre-novo-sistema-nome");
  const erroEl = document.getElementById("cofre-sistemas-erro");
  if (!input.value.trim()) return;

  try {
    await apiCofre("/sistemas", { method: "POST", body: JSON.stringify({ nome: input.value.trim() }) });
    input.value = "";
    erroEl.textContent = "";
    await carregarSistemas();
    renderListaSistemas();
  } catch (err) {
    erroEl.textContent = err.message;
  }
});

// --- Lista de credenciais ---

function credenciaisFiltradas() {
  const termo = document.getElementById("cofre-busca").value.trim().toLowerCase();
  if (!termo) return credenciaisCache;
  return credenciaisCache.filter((c) => {
    const sistema = nomeSistema(c.sistemaId).toLowerCase();
    return c.cliente.toLowerCase().includes(termo) || sistema.includes(termo);
  });
}

function formatarValidade(v) {
  if (!v) return "-";
  return new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR");
}

function renderCofreTabela() {
  const tbody = document.querySelector("#tabela-cofre tbody");
  tbody.innerHTML = "";
  fecharLinhaRevelada();

  const lista = credenciaisFiltradas();
  document.getElementById("cofre-vazio").classList.toggle("oculto", lista.length > 0);
  document.getElementById("tabela-cofre").classList.toggle("oculto", lista.length === 0);

  for (const c of lista) {
    const tr = document.createElement("tr");
    tr.dataset.id = c.id;

    const tdCliente = document.createElement("td");
    tdCliente.dataset.rotulo = "Cliente";
    tdCliente.textContent = c.cliente;

    const tdSistema = document.createElement("td");
    tdSistema.dataset.rotulo = "Sistema";
    tdSistema.textContent = nomeSistema(c.sistemaId);

    const tdLink = document.createElement("td");
    tdLink.dataset.rotulo = "Link";
    if (c.link) {
      const a = document.createElement("a");
      a.href = c.link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Abrir";
      tdLink.appendChild(a);
    } else {
      tdLink.textContent = "-";
    }

    const tdValidade = document.createElement("td");
    tdValidade.dataset.rotulo = "Validade";
    tdValidade.textContent = formatarValidade(c.validade);

    const tdAcao = document.createElement("td");
    tdAcao.dataset.rotulo = "Ação";
    const wrapAcao = document.createElement("div");
    wrapAcao.className = "cofre-acoes-linha";

    const btnMostrar = document.createElement("button");
    btnMostrar.className = "botao-secundario";
    btnMostrar.type = "button";
    btnMostrar.textContent = "Mostrar";
    btnMostrar.addEventListener("click", () => alternarRevelar(c.id, tr));

    const btnEditar = document.createElement("button");
    btnEditar.className = "botao-secundario";
    btnEditar.type = "button";
    btnEditar.textContent = "Editar";
    btnEditar.addEventListener("click", () => abrirModalCredencial(c));

    const btnArquivar = document.createElement("button");
    btnArquivar.className = "botao-secundario";
    btnArquivar.type = "button";
    btnArquivar.textContent = "Arquivar";
    btnArquivar.addEventListener("click", () => arquivarCredencial(c.id));

    wrapAcao.append(btnMostrar, btnEditar, btnArquivar);
    tdAcao.appendChild(wrapAcao);

    tr.append(tdCliente, tdSistema, tdLink, tdValidade, tdAcao);
    tbody.appendChild(tr);
  }
}

async function arquivarCredencial(id) {
  if (!confirm("Arquivar este acesso? Ele sai da lista, mas fica recuperavel depois.")) return;
  try {
    credenciaisCache = await apiCofre(`/credenciais/${id}/arquivar`, { method: "POST" });
    renderCofreTabela();
  } catch (err) {
    alert(err.message);
  }
}

// --- Revelar (um segredo por vez, sob demanda) ---

function fecharLinhaRevelada() {
  if (!linhaRevelada) return;
  clearTimeout(linhaRevelada.timeoutRemask);
  linhaRevelada.painelTr.remove();
  linhaRevelada = null;
}

async function revelarComGarantia(id) {
  const ok = await garantirDestrave();
  if (!ok) return null;
  try {
    return await apiCofre(`/credenciais/${id}/revelar`);
  } catch (err) {
    if (!err.cofreTravado) throw err;
    // A janela de 5 min expirou entre a checagem local e a chamada - pede de novo.
    atualizarChipTrava();
    const ok2 = await garantirDestrave();
    if (!ok2) return null;
    return apiCofre(`/credenciais/${id}/revelar`);
  }
}

async function copiarComLimpeza(valor, botao) {
  try {
    await navigator.clipboard.writeText(valor);
    const textoOriginal = botao.textContent;
    botao.textContent = "Copiado!";
    setTimeout(() => {
      botao.textContent = textoOriginal;
    }, 1500);

    // So limpa se a area de transferencia ainda tiver o que copiamos - evita
    // apagar algo que o usuario colou por cima nesse meio-tempo.
    setTimeout(async () => {
      try {
        const atual = await navigator.clipboard.readText();
        if (atual === valor) await navigator.clipboard.writeText("");
      } catch {
        // Sem permissao de leitura da area de transferencia - nao ha como
        // confirmar com seguranca, entao nao limpa.
      }
    }, TEMPO_EXPOSICAO_MS);
  } catch {
    alert("Nao foi possivel copiar. Copie manualmente.");
  }
}

function campoRevelado(rotulo, valor, { mascarar = false, copiar = true } = {}) {
  const linha = document.createElement("div");
  linha.className = "cofre-campo-revelado";

  const rotuloEl = document.createElement("span");
  rotuloEl.className = "cofre-rotulo-revelado";
  rotuloEl.textContent = rotulo;

  const valorEl = document.createElement("span");
  valorEl.className = mascarar ? "cofre-valor-revelado cofre-valor-mono" : "cofre-valor-revelado";
  valorEl.textContent = mascarar ? "••••••••" : valor;

  linha.append(rotuloEl, valorEl);

  if (mascarar) {
    let visivel = false;
    const btnMostrar = document.createElement("button");
    btnMostrar.className = "botao-secundario";
    btnMostrar.type = "button";
    btnMostrar.textContent = "Mostrar";
    btnMostrar.addEventListener("click", () => {
      visivel = !visivel;
      valorEl.textContent = visivel ? valor : "••••••••";
      btnMostrar.textContent = visivel ? "Ocultar" : "Mostrar";
    });
    linha.appendChild(btnMostrar);
  }

  if (copiar) {
    const btnCopiar = document.createElement("button");
    btnCopiar.className = "botao-secundario";
    btnCopiar.type = "button";
    btnCopiar.textContent = "Copiar";
    btnCopiar.addEventListener("click", () => copiarComLimpeza(valor, btnCopiar));
    linha.appendChild(btnCopiar);
  }

  return linha;
}

function montarLinhaRevelada(id, tr, dados) {
  const painelTr = document.createElement("tr");
  painelTr.className = "cofre-linha-revelada";
  const td = document.createElement("td");
  td.colSpan = 5;

  const painel = document.createElement("div");
  painel.className = "cofre-painel-revelado";
  painel.append(
    campoRevelado("Login", dados.login),
    campoRevelado("Senha", dados.senha, { mascarar: true })
  );

  if (dados.observacoes) {
    painel.appendChild(campoRevelado("Notas", dados.observacoes, { copiar: false }));
  }

  const aviso = document.createElement("p");
  aviso.className = "texto-fraco cofre-aviso-exposicao";
  aviso.textContent = "Isso oculta sozinho em alguns segundos.";
  painel.appendChild(aviso);

  td.appendChild(painel);
  painelTr.appendChild(td);
  tr.after(painelTr);

  const timeoutRemask = setTimeout(fecharLinhaRevelada, TEMPO_EXPOSICAO_MS);
  linhaRevelada = { id, painelTr, timeoutRemask };
}

async function alternarRevelar(id, tr) {
  if (linhaRevelada?.id === id) {
    fecharLinhaRevelada();
    return;
  }
  fecharLinhaRevelada();

  let dados;
  try {
    dados = await revelarComGarantia(id);
  } catch (err) {
    alert(err.message);
    return;
  }
  if (!dados) return; // usuario cancelou o destrave

  montarLinhaRevelada(id, tr, dados);
}

// --- Criar / editar ---

const modalCredencial = document.getElementById("modal-cofre-credencial");

function abrirModalCredencial(credencial) {
  const editando = Boolean(credencial);
  document.getElementById("cofre-credencial-titulo").textContent = editando ? "Editar acesso" : "Novo acesso";
  document.getElementById("cofre-credencial-id").value = editando ? credencial.id : "";
  document.getElementById("cofre-cliente").value = editando ? credencial.cliente : "";
  preencherSelectSistemas(editando ? credencial.sistemaId : sistemasCache.find((s) => s.ativo)?.id);
  document.getElementById("cofre-link").value = editando ? credencial.link || "" : "";
  document.getElementById("cofre-validade").value = editando ? credencial.validade || "" : "";

  const inputLogin = document.getElementById("cofre-login");
  const inputSenha = document.getElementById("cofre-senha");
  inputLogin.value = "";
  inputSenha.value = "";
  inputLogin.placeholder = editando ? "Deixe em branco para manter o login atual" : "";
  inputSenha.placeholder = editando ? "Deixe em branco para manter a senha atual" : "";

  document.getElementById("cofre-observacoes").value = "";
  document.getElementById("cofre-credencial-ajuda-senha").classList.toggle("oculto", !editando);
  document.getElementById("cofre-credencial-erro").textContent = "";
  modalCredencial.classList.remove("oculto");
  document.getElementById("cofre-cliente").focus();
}

function fecharModalCredencial() {
  modalCredencial.classList.add("oculto");
}

document.getElementById("btn-cofre-novo").addEventListener("click", () => abrirModalCredencial(null));
document.getElementById("btn-cofre-credencial-cancelar").addEventListener("click", fecharModalCredencial);

document.getElementById("form-cofre-credencial").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = document.getElementById("cofre-credencial-id").value;
  const erroEl = document.getElementById("cofre-credencial-erro");

  const corpo = {
    cliente: document.getElementById("cofre-cliente").value,
    sistemaId: document.getElementById("cofre-sistema").value,
    link: document.getElementById("cofre-link").value || null,
    validade: document.getElementById("cofre-validade").value || null,
    login: document.getElementById("cofre-login").value,
    senha: document.getElementById("cofre-senha").value,
    observacoes: document.getElementById("cofre-observacoes").value || null,
  };

  try {
    if (id) {
      await apiCofre(`/credenciais/${id}`, { method: "PATCH", body: JSON.stringify(corpo) });
    } else {
      await apiCofre("/credenciais", { method: "POST", body: JSON.stringify(corpo) });
    }
    await carregarCredenciais();
    fecharModalCredencial();
  } catch (err) {
    erroEl.textContent = err.message;
  }
});

// --- Carregamento inicial ---

async function carregarCredenciais() {
  credenciaisCache = await apiCofre("/credenciais");
  renderCofreTabela();
}

document.getElementById("cofre-busca").addEventListener("input", renderCofreTabela);

async function carregarCofre() {
  try {
    await carregarSistemas();
    // Nao reconstroi a tabela enquanto uma senha esta revelada na tela -
    // senao o refresh automatico apagaria ela antes dos 20s de exposicao.
    if (!linhaRevelada) await carregarCredenciais();
  } catch {
    // Sem sessao ainda (tela de login) - carregarTudo do app.js tenta de novo
    // no proximo ciclo, uma vez logado.
  }
  atualizarChipTrava();
}

// O cofre carrega junto do resto do dashboard, na mesma cadencia de
// atualizacao automatica do app.js (nao entra no Promise.all de carregarTudo
// pra nao acoplar os dois arquivos - so espelha o mesmo intervalo).
if (!telaDashboard.classList.contains("oculto")) {
  carregarCofre();
}
setInterval(() => {
  if (!telaDashboard.classList.contains("oculto")) {
    carregarCofre();
  }
}, 15000);
