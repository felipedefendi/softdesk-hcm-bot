import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api } from "../../api/cliente";
import { Marca } from "../../components/Marca";
import type { ConviteInfo } from "../../api/tipos";
import styles from "../Login.module.css";

/**
 * Pagina publica (sem sessao, sem AuthProvider aplicavel) onde quem acabou de
 * ser convidado define a propria senha. Fica fora do guard de autenticacao em
 * App.tsx de proposito - ninguem chega aqui logado.
 */
export function CompletarConvite() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ConviteInfo | null>(null);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<ConviteInfo>(`/convite/${token}`)
      .then(setInfo)
      .catch((err) => setErroCarregar(err instanceof Error ? err.message : String(err)));
  }, [token]);

  async function aoEnviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);

    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setEnviando(true);
    try {
      await api(`/convite/${token}`, { method: "POST", body: JSON.stringify({ senha }) });
      setConcluido(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setEnviando(false);
    }
  }

  if (concluido) {
    return (
      <div className={styles.tela}>
        <div className={styles.cartao}>
          <div className={styles.marca}>
            <Marca tamanho={44} />
          </div>
          <CheckCircle2 size={40} strokeWidth={1.5} color="var(--acento)" />
          <h1 className={styles.titulo}>Senha definida</h1>
          <p className={styles.subtitulo}>Sua conta está pronta. Já pode entrar com seu e-mail e a senha que você acabou de criar.</p>
          <Link to="/" className={styles.botao} style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  if (erroCarregar) {
    return (
      <div className={styles.tela}>
        <div className={styles.cartao}>
          <div className={styles.marca}>
            <Marca tamanho={44} />
          </div>
          <h1 className={styles.titulo}>Link inválido</h1>
          <p className={styles.erro}>{erroCarregar}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tela}>
      <form className={styles.cartao} onSubmit={aoEnviar}>
        <div className={styles.marca}>
          <Marca tamanho={44} />
        </div>
        <h1 className={styles.titulo}>Bem-vindo(a){info ? `, ${info.nome.split(" ")[0]}` : ""}</h1>
        <p className={styles.subtitulo}>{info ? `Defina a senha da conta ${info.email}.` : "Carregando..."}</p>
        <input
          type="password"
          value={senha}
          onChange={(ev) => setSenha(ev.target.value)}
          placeholder="Nova senha"
          autoFocus
          autoComplete="new-password"
          className={styles.campo}
          disabled={!info}
        />
        <input
          type="password"
          value={confirmar}
          onChange={(ev) => setConfirmar(ev.target.value)}
          placeholder="Confirme a senha"
          autoComplete="new-password"
          className={styles.campo}
          disabled={!info}
        />
        <button type="submit" className={styles.botao} disabled={enviando || !info}>
          {enviando ? "Salvando..." : "Definir senha"}
        </button>
        <p className={styles.erro}>{erro}</p>
      </form>
    </div>
  );
}
