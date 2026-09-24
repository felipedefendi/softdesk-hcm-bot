import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useApi } from "../../api/useApi";
import type { Atendente, AtendenteSoftDesk, NovoUsuarioEntrada } from "../../api/tipos";
import styles from "./Formularios.module.css";

interface Props {
  atendentes: Atendente[];
  onSalvar: (entrada: NovoUsuarioEntrada) => Promise<void>;
  onCancelar: () => void;
}

export function FormularioUsuario({ atendentes, onSalvar, onCancelar }: Props) {
  const api = useApi();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<"admin" | "comum">("comum");
  const [usuarioAtendente, setUsuarioAtendente] = useState(false);
  const [codigoAtendente, setCodigoAtendente] = useState("");
  const [softDesk, setSoftDesk] = useState<AtendenteSoftDesk[] | null>(null);
  const [erroSoftDesk, setErroSoftDesk] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // A lista vem do SoftDesk (alguns segundos na primeira vez), entao so e
  // buscada quando alguem marca "Usuario atendente".
  const carregarSoftDesk = useCallback(async () => {
    setErroSoftDesk(null);
    try {
      setSoftDesk(await api<AtendenteSoftDesk[]>("/usuarios/atendentes-softdesk"));
    } catch (err) {
      setErroSoftDesk(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    if (usuarioAtendente && softDesk === null && erroSoftDesk === null) carregarSoftDesk();
  }, [usuarioAtendente, softDesk, erroSoftDesk, carregarSoftDesk]);

  const codigo = usuarioAtendente && codigoAtendente ? Number(codigoAtendente) : null;
  const existente = codigo === null ? undefined : atendentes.find((a) => a.codigoAtendente === codigo);
  const noRodizio = new Set(atendentes.map((a) => a.codigoAtendente));

  function escolherAtendente(valor: string) {
    setCodigoAtendente(valor);
    // Com o nome em branco, usa o do SoftDesk - e o nome que aparece no rodizio.
    const escolhido = softDesk?.find((a) => String(a.codigo) === valor);
    if (escolhido && !nome.trim()) setNome(escolhido.nome);
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await onSalvar({ nome, email, papel, codigoAtendente: codigo, usuarioAtendente });
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <label className={styles.campo}>
        Nome
        <input value={nome} onChange={(ev) => setNome(ev.target.value)} required />
      </label>

      <label className={styles.campo}>
        E-mail (corporativo)
        <input type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} required />
      </label>

      <fieldset className={styles.opcoes}>
        <legend className={styles.legenda}>Papel</legend>
        <label className={styles.opcao}>
          <input type="radio" name="papel" checked={papel === "comum"} onChange={() => setPapel("comum")} />
          <span>
            <strong>Comum</strong>
            <small>Vê tudo, mexe no próprio atendente e nas próprias férias.</small>
          </span>
        </label>
        <label className={styles.opcao}>
          <input type="radio" name="papel" checked={papel === "admin"} onChange={() => setPapel("admin")} />
          <span>
            <strong>Administrador</strong>
            <small>Também gerencia equipe, configurações e usuários.</small>
          </span>
        </label>
      </fieldset>

      <label className={styles.opcao}>
        <input type="checkbox" checked={usuarioAtendente} onChange={(ev) => setUsuarioAtendente(ev.target.checked)} />
        <span>
          <strong>Usuário atendente</strong>
          <small>Recebe chamados pelo rodízio. Desmarcado, a conta fica só de gestão.</small>
        </span>
      </label>

      {usuarioAtendente && (
        <>
          {erroSoftDesk ? (
            <p className={styles.erro}>
              {erroSoftDesk}{" "}
              <button type="button" className="botao-secundario" onClick={carregarSoftDesk}>
                Tentar de novo
              </button>
            </p>
          ) : (
            <label className={styles.campo}>
              Atendente no SoftDesk
              <select
                value={codigoAtendente}
                onChange={(ev) => escolherAtendente(ev.target.value)}
                disabled={softDesk === null}
                required
              >
                <option value="">{softDesk === null ? "Buscando atendentes no SoftDesk..." : "Selecione"}</option>
                {softDesk?.map((a) => (
                  <option key={a.codigo} value={a.codigo}>
                    {a.nome} (#{a.codigo}){noRodizio.has(a.codigo) ? " — já no rodízio" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {codigo !== null && (
            <p className={styles.aviso}>
              {existente
                ? `Este atendente já está no rodízio como ${existente.nome} — a conta só será vinculada a ele.`
                : `Novo atendente: ${nome.trim() || "a pessoa"} entra ativo no fim da fila com o código #${codigo}.`}
            </p>
          )}
        </>
      )}

      {erro && <p className={styles.erro}>{erro}</p>}

      <div className={styles.acoes}>
        <button type="submit" disabled={enviando}>
          {enviando ? "Criando..." : "Criar conta"}
        </button>
        <button type="button" className="botao-secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
