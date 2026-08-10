import { ExternalLink } from "lucide-react";
import { Cartao } from "../../components/Cartao";
import { useAuth } from "../../auth/AuthContext";
import styles from "./Perfil.module.css";

const PORTAL_SENIOR = "https://platform.senior.com.br/senior-x/";

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

        <div className={styles.senha}>
          <p className={styles.aviso}>
            Você entra no painel com a mesma conta Senior de sempre. Para trocar sua senha, é lá no portal da Senior — por
            aqui não há senha própria pra alterar.
          </p>
          <a className={styles.linkPortal} href={PORTAL_SENIOR} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} strokeWidth={1.75} />
            Trocar senha no portal Senior X
          </a>
        </div>
      </Cartao>
    </div>
  );
}
