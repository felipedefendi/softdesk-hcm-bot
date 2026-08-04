import { useState, type FormEvent } from "react";
import type { Atendente, NovoUsuarioEntrada } from "../../api/tipos";
import styles from "./Formularios.module.css";

interface Props {
  atendentes: Atendente[];
  onSalvar: (entrada: NovoUsuarioEntrada) => Promise<void>;
  onCancelar: () => void;
}

export function FormularioUsuario({ atendentes, onSalvar, onCancelar }: Props) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<"admin" | "comum">("comum");
  const [codigoAtendente, setCodigoAtendente] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await onSalvar({
        nome,
        email,
        papel,
        codigoAtendente: codigoAtendente ? Number(codigoAtendente) : null,
      });
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

      <label className={styles.campo}>
        Atendente vinculado <span className={styles.opcional}>(opcional)</span>
        <select value={codigoAtendente} onChange={(ev) => setCodigoAtendente(ev.target.value)}>
          <option value="">Nenhum (só gestão, fora do rodízio)</option>
          {atendentes.map((a) => (
            <option key={a.codigoAtendente} value={a.codigoAtendente}>
              {a.nome}
            </option>
          ))}
        </select>
      </label>

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
