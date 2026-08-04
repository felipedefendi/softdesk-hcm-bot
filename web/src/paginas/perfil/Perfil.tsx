import { useState, type FormEvent } from "react";
import { Cartao } from "../../components/Cartao";
import { useAuth } from "../../auth/AuthContext";
import { useApi } from "../../api/useApi";
import styles from "./Perfil.module.css";

export function Perfil() {
  const { eu } = useAuth();
  const api = useApi();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoSalvar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setMensagem(null);

    if (novaSenha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setEnviando(true);
    try {
      await api("/perfil/senha", { method: "POST", body: JSON.stringify({ senhaAtual, novaSenha }) });
      setMensagem("Senha atualizada.");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmar("");
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setEnviando(false);
    }
  }

  // Sessao da senha compartilhada nao tem conta propria - nao ha senha
  // pessoal pra trocar (ver PLANO-USUARIOS.md).
  if (eu?.tipo === "legado") {
    return (
      <div className={styles.pagina}>
        <Cartao>
          <h2 className={styles.titulo}>Meu perfil</h2>
          <p className={styles.aviso}>
            Você está usando a senha compartilhada do painel, sem conta própria. Peça a um administrador para criar
            sua conta.
          </p>
        </Cartao>
      </div>
    );
  }

  return (
    <div className={styles.pagina}>
      <Cartao>
        <h2 className={styles.titulo}>Meu perfil</h2>
        <div className={styles.info}>
          <span className={styles.rotulo}>Nome</span>
          <span>{eu?.nome}</span>
          <span className={styles.rotulo}>Papel</span>
          <span>{eu?.papel === "admin" ? "Administrador" : "Comum"}</span>
        </div>
      </Cartao>

      <Cartao>
        <h2 className={styles.titulo}>Trocar senha</h2>
        <form onSubmit={aoSalvar} className={styles.form}>
          <label className={styles.campo}>
            Senha atual
            <input type="password" value={senhaAtual} onChange={(ev) => setSenhaAtual(ev.target.value)} autoComplete="current-password" required />
          </label>
          <label className={styles.campo}>
            Nova senha
            <input type="password" value={novaSenha} onChange={(ev) => setNovaSenha(ev.target.value)} autoComplete="new-password" required />
          </label>
          <label className={styles.campo}>
            Confirmar nova senha
            <input type="password" value={confirmar} onChange={(ev) => setConfirmar(ev.target.value)} autoComplete="new-password" required />
          </label>
          <button type="submit" disabled={enviando}>
            {enviando ? "Salvando..." : "Salvar"}
          </button>
        </form>
        {erro && <p className={styles.erro}>{erro}</p>}
        {mensagem && <p className={styles.mensagem}>{mensagem}</p>}
      </Cartao>
    </div>
  );
}
