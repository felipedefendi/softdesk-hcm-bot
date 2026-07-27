import { useState, type FormEvent } from "react";
import type { CredencialEntrada, CredencialMetadados, Sistema } from "../../api/tipos";
import styles from "./FormularioCredencial.module.css";

interface Props {
  sistemas: Sistema[];
  /** null = criando uma credencial nova; presente = editando (login/senha/observacoes nao vem pre-preenchidos). */
  credencial: CredencialMetadados | null;
  onSalvar: (entrada: CredencialEntrada) => Promise<void>;
  onCancelar: () => void;
}

export function FormularioCredencial({ sistemas, credencial, onSalvar, onCancelar }: Props) {
  const editando = credencial !== null;

  const [cliente, setCliente] = useState(credencial?.cliente ?? "");
  const [sistemaId, setSistemaId] = useState(credencial?.sistemaId ?? sistemas[0]?.id ?? "");
  const [link, setLink] = useState(credencial?.link ?? "");
  const [validade, setValidade] = useState(credencial?.validade ?? "");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoSubmeter(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await onSalvar({
        cliente,
        sistemaId,
        link: link || null,
        validade: validade || null,
        login,
        senha,
        observacoes: observacoes || null,
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={aoSubmeter} className={styles.form}>
      {erro && <p className={styles.erro}>{erro}</p>}

      <label className={styles.campo}>
        Cliente
        <input value={cliente} onChange={(ev) => setCliente(ev.target.value)} required />
      </label>

      <label className={styles.campo}>
        Sistema
        <select value={sistemaId} onChange={(ev) => setSistemaId(ev.target.value)} required>
          {sistemas
            .filter((s) => s.ativo || s.id === sistemaId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
        </select>
      </label>

      <label className={styles.campo}>
        Link
        <input type="url" placeholder="https://..." value={link} onChange={(ev) => setLink(ev.target.value)} />
      </label>

      <label className={styles.campo}>
        Validade
        <input type="date" value={validade} onChange={(ev) => setValidade(ev.target.value)} />
      </label>

      <label className={styles.campo}>
        Login
        <input
          value={login}
          onChange={(ev) => setLogin(ev.target.value)}
          placeholder={editando ? "Deixe em branco para manter" : ""}
          required={!editando}
        />
      </label>

      <label className={styles.campo}>
        Senha
        <input
          type="password"
          value={senha}
          onChange={(ev) => setSenha(ev.target.value)}
          placeholder={editando ? "Deixe em branco para manter" : ""}
          required={!editando}
        />
      </label>

      <label className={styles.campo}>
        Observações
        <textarea
          value={observacoes}
          onChange={(ev) => setObservacoes(ev.target.value)}
          placeholder={editando ? "Deixe em branco para manter" : ""}
          rows={3}
        />
      </label>

      <div className={styles.acoes}>
        <button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" className="botao-secundario" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
