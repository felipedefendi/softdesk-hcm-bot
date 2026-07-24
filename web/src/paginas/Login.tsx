import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import styles from "./Login.module.css";

export function Login() {
  const { entrar, erroLogin } = useAuth();
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    setEnviando(true);
    try {
      await entrar(senha);
    } catch {
      // erroLogin ja reflete a mensagem, nao precisa fazer nada aqui
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.tela}>
      <form className={styles.cartao} onSubmit={aoEnviar}>
        <h1 className={styles.titulo}>Rodízio HCM</h1>
        <p className={styles.subtitulo}>Digite a senha do painel</p>
        <input
          type="password"
          value={senha}
          onChange={(ev) => setSenha(ev.target.value)}
          placeholder="Senha"
          autoFocus
          autoComplete="current-password"
          className={styles.campo}
        />
        <button type="submit" className={styles.botao} disabled={enviando}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
        <p className={styles.erro}>{erroLogin}</p>
      </form>
    </div>
  );
}
