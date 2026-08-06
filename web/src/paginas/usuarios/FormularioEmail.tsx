import { useState, type FormEvent } from "react";
import styles from "./Formularios.module.css";

interface Props {
  emailAtual: string;
  onSalvar: (email: string) => Promise<void>;
  onCancelar: () => void;
}

/** Corrige o e-mail de login (o mesmo usado como usuario no login da Senior). */
export function FormularioEmail({ emailAtual, onSalvar, onCancelar }: Props) {
  const [email, setEmail] = useState(emailAtual);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await onSalvar(email);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <label className={styles.campo}>
        E-mail (login da Senior)
        <input type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} required autoFocus />
      </label>

      {erro && <p className={styles.erro}>{erro}</p>}

      <div className={styles.acoes}>
        <button type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar e-mail"}
        </button>
        <button type="button" className="botao-secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
