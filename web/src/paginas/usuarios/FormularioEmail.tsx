import { useState, type FormEvent } from "react";
import styles from "./Formularios.module.css";

interface Props {
  /** E-mail completo atual (usuario@tenant). O usuario edita so a parte antes do @. */
  emailAtual: string;
  onSalvar: (email: string) => Promise<void>;
  onCancelar: () => void;
}

/**
 * Edita o nome de usuario do SeniorX (que e o login). Como todo mundo esta no
 * mesmo tenant, mostra e edita so a parte antes do @ e reanexa o mesmo dominio
 * do cadastro atual - sem obrigar a digitar o "@seniornortepr..." toda vez.
 */
export function FormularioEmail({ emailAtual, onSalvar, onCancelar }: Props) {
  const [usuarioAtual, dominio] = emailAtual.split("@");
  const [usuario, setUsuario] = useState(usuarioAtual);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      // Se digitarem o e-mail completo (com @), respeita; senao reanexa o tenant.
      const email = usuario.includes("@") || !dominio ? usuario : `${usuario}@${dominio}`;
      await onSalvar(email);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <label className={styles.campo}>
        Nome de usuário (SeniorX)
        <input value={usuario} onChange={(ev) => setUsuario(ev.target.value)} required autoFocus />
        {dominio && (
          <small>
            <strong>@{dominio}</strong> é adicionado automaticamente.
          </small>
        )}
      </label>

      {erro && <p className={styles.erro}>{erro}</p>}

      <div className={styles.acoes}>
        <button type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" className="botao-secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
