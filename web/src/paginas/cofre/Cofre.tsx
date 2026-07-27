import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Search, Copy, Pencil, Archive, Lock, LockOpen, Plus } from "lucide-react";
import { Cartao } from "../../components/Cartao";
import { DrawerLateral } from "../../components/DrawerLateral";
import { Esqueleto } from "../../components/Esqueleto";
import { ErroCarregamento } from "../../components/ErroCarregamento";
import { useCofreCredenciais } from "../../hooks/useCofreCredenciais";
import { useCofreSistemas } from "../../hooks/useCofreSistemas";
import { useCofreDestrave } from "../../hooks/useCofreDestrave";
import { useCofreRevelar } from "../../hooks/useCofreRevelar";
import { agruparCredenciais } from "../../lib/agruparCredenciais";
import { infoValidade } from "../../lib/diasParaVencer";
import type { CredencialEntrada, CredencialMetadados } from "../../api/tipos";
import { FormularioCredencial } from "./FormularioCredencial";
import styles from "./Cofre.module.css";

const HOJE = new Date().toISOString().slice(0, 10);

function formatarContagem(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatarDataCurta(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function Cofre() {
  const { credenciais, erro, recarregar, criar, editar, arquivar } = useCofreCredenciais();
  const sistemas = useCofreSistemas();
  const { destravado, segundosRestantes, destravar, trancar } = useCofreDestrave();
  const { revelar } = useCofreRevelar();

  const [busca, setBusca] = useState("");
  const [senhaDestrave, setSenhaDestrave] = useState("");
  const [erroDestrave, setErroDestrave] = useState<string | null>(null);
  const [destravando, setDestravando] = useState(false);
  const [copiando, setCopiando] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ aberto: boolean; editando: CredencialMetadados | null }>({
    aberto: false,
    editando: null,
  });

  const buscaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function aoTeclar(ev: KeyboardEvent) {
      const alvo = document.activeElement;
      const emCampo = alvo instanceof HTMLInputElement || alvo instanceof HTMLTextAreaElement || alvo instanceof HTMLSelectElement;
      if (ev.key === "/" && !emCampo) {
        ev.preventDefault();
        buscaRef.current?.focus();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const nomeSistema = useCallback((id: string) => sistemas?.find((s) => s.id === id)?.nome ?? id, [sistemas]);

  const grupos = useMemo(
    () => (credenciais ? agruparCredenciais(credenciais, busca, HOJE, nomeSistema) : []),
    [credenciais, busca, nomeSistema]
  );

  async function aoDestravar(ev: FormEvent) {
    ev.preventDefault();
    setErroDestrave(null);
    setDestravando(true);
    try {
      await destravar(senhaDestrave);
      setSenhaDestrave("");
    } catch (err) {
      setErroDestrave(err instanceof Error ? err.message : String(err));
    } finally {
      setDestravando(false);
    }
  }

  async function copiar(id: string, campo: "login" | "senha") {
    setCopiando(`${id}-${campo}`);
    try {
      const dados = await revelar(id);
      await navigator.clipboard.writeText(dados[campo]);
      setToast(campo === "login" ? "Login copiado" : "Senha copiada");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Erro ao copiar");
    } finally {
      setCopiando(null);
    }
  }

  async function aoArquivar(c: CredencialMetadados) {
    if (!window.confirm(`Arquivar a credencial de "${c.cliente}"? Ela sai da lista, mas continua recuperável.`)) return;
    try {
      await arquivar(c.id);
      setToast("Credencial arquivada");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Erro ao arquivar");
    }
  }

  async function aoSalvarForm(entrada: CredencialEntrada) {
    if (drawer.editando) {
      await editar(drawer.editando.id, entrada);
      setToast("Credencial atualizada");
    } else {
      await criar(entrada);
      setToast("Credencial criada");
    }
    setDrawer({ aberto: false, editando: null });
  }

  return (
    <div className={styles.pagina}>
      <Cartao className={styles.barraDestrave}>
        {destravado ? (
          <div className={styles.statusDestrave}>
            <LockOpen size={18} strokeWidth={1.5} />
            <span>Cofre destravado — expira em {formatarContagem(segundosRestantes)}</span>
            <button type="button" className="botao-secundario" onClick={trancar}>
              Trancar agora
            </button>
          </div>
        ) : (
          <form onSubmit={aoDestravar} className={styles.formDestrave}>
            <Lock size={18} strokeWidth={1.5} />
            <input
              type="password"
              placeholder="Senha do painel"
              value={senhaDestrave}
              onChange={(ev) => setSenhaDestrave(ev.target.value)}
              aria-label="Senha para destravar o cofre"
            />
            <button type="submit" disabled={destravando}>
              {destravando ? "Destravando..." : "Destravar"}
            </button>
            {erroDestrave && <span className={styles.erroDestrave}>{erroDestrave}</span>}
          </form>
        )}
      </Cartao>

      <Cartao>
        <div className={styles.cabecalho}>
          <h2 className={styles.titulo}>Cofre de senhas</h2>
          <button type="button" onClick={() => setDrawer({ aberto: true, editando: null })}>
            <Plus size={16} strokeWidth={2} /> Nova credencial
          </button>
        </div>

        <div className={styles.buscaWrap}>
          <Search size={16} strokeWidth={1.5} className={styles.iconeBusca} />
          <input
            ref={buscaRef}
            type="search"
            placeholder="Buscar por cliente, sistema ou link (atalho: /)"
            value={busca}
            onChange={(ev) => setBusca(ev.target.value)}
            className={styles.busca}
            aria-label="Buscar credenciais"
          />
        </div>

        {credenciais === null && erro && <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />}
        {credenciais === null && !erro && <Esqueleto linhas={3} />}
        {credenciais !== null && grupos.length === 0 && (
          <p className={styles.vazio}>
            {busca ? "Nenhuma credencial encontrada para a busca." : "Nenhuma credencial cadastrada ainda."}
          </p>
        )}

        {grupos.map((grupo) => (
          <div key={grupo.cliente} className={styles.grupo}>
            <h3 className={styles.clienteTitulo}>{grupo.cliente}</h3>
            <table>
              <thead>
                <tr>
                  <th>Sistema</th>
                  <th>Link</th>
                  <th>Validade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {grupo.credenciais.map((c) => {
                  const info = infoValidade(c.validade, HOJE);
                  return (
                    <tr key={c.id}>
                      <td data-rotulo="Sistema">{nomeSistema(c.sistemaId)}</td>
                      <td data-rotulo="Link">
                        {c.link ? (
                          <a href={c.link} target="_blank" rel="noreferrer">
                            Abrir
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-rotulo="Validade">
                        {info.status === "sem-data" && <span className={styles.badgeNeutro}>—</span>}
                        {info.status === "vencida" && <span className={styles.badgeVencida}>Vencida há {Math.abs(info.dias!)}d</span>}
                        {info.status === "proxima" && <span className={styles.badgeProxima}>Vence em {info.dias}d</span>}
                        {info.status === "ok" && c.validade && <span className={styles.badgeOk}>{formatarDataCurta(c.validade)}</span>}
                      </td>
                      <td data-rotulo="Ações" className={styles.acoesCelula}>
                        <button
                          type="button"
                          className={styles.botaoIcone}
                          title={destravado ? "Copiar login" : "Destrave o cofre para copiar"}
                          aria-label={`Copiar login de ${c.cliente}`}
                          disabled={!destravado || copiando === `${c.id}-login`}
                          onClick={() => copiar(c.id, "login")}
                        >
                          <Copy size={14} strokeWidth={1.5} /> Login
                        </button>
                        <button
                          type="button"
                          className={styles.botaoIcone}
                          title={destravado ? "Copiar senha" : "Destrave o cofre para copiar"}
                          aria-label={`Copiar senha de ${c.cliente}`}
                          disabled={!destravado || copiando === `${c.id}-senha`}
                          onClick={() => copiar(c.id, "senha")}
                        >
                          <Copy size={14} strokeWidth={1.5} /> Senha
                        </button>
                        <button
                          type="button"
                          className={styles.botaoIcone}
                          title="Editar"
                          aria-label={`Editar credencial de ${c.cliente}`}
                          onClick={() => setDrawer({ aberto: true, editando: c })}
                        >
                          <Pencil size={14} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          className={styles.botaoIcone}
                          title="Arquivar"
                          aria-label={`Arquivar credencial de ${c.cliente}`}
                          onClick={() => aoArquivar(c)}
                        >
                          <Archive size={14} strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </Cartao>

      <DrawerLateral
        aberto={drawer.aberto}
        titulo={drawer.editando ? "Editar credencial" : "Nova credencial"}
        onFechar={() => setDrawer({ aberto: false, editando: null })}
      >
        <FormularioCredencial
          sistemas={sistemas ?? []}
          credencial={drawer.editando}
          onSalvar={aoSalvarForm}
          onCancelar={() => setDrawer({ aberto: false, editando: null })}
        />
      </DrawerLateral>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
