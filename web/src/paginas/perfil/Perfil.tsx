import { Cartao } from "../../components/Cartao";
import { useAuth } from "../../auth/AuthContext";
import styles from "./Perfil.module.css";

export function Perfil() {
  const { eu } = useAuth();

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
        <p className={styles.aviso}>A senha é a da sua conta Senior — troque-a no portal da Senior, não aqui.</p>
      </Cartao>
    </div>
  );
}
