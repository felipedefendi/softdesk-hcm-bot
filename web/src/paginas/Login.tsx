import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { Marca } from "../components/Marca";
import styles from "./Login.module.css";

export function Login() {
  const { entrar, erroLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    setEnviando(true);
    try {
      await entrar({ email, senha });
    } catch {
      // erroLogin ja reflete a mensagem, nao precisa fazer nada aqui
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.tela}>
      <form className={styles.cartao} onSubmit={aoEnviar}>
        <div className={styles.marca}>
          <Marca tamanho={44} />
        </div>
        <h1 className={styles.titulo}>Painel Administrativo</h1>
        <p className={styles.sigla}>HCM</p>
        <p className={styles.subtitulo}>Entre com seu e-mail e a senha da Senior</p>
        <input
          type="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder="E-mail da Senior"
          autoComplete="email"
          required
          className={styles.campo}
        />
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
