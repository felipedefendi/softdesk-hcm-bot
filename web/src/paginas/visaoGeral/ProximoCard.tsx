import { Cartao } from "../../components/Cartao";
import { useRotation } from "../../hooks/useRotation";
import styles from "./ProximoCard.module.css";

export function ProximoCard() {
  const { proximo, erro } = useRotation({ comPoll: true });

  return (
    <Cartao>
      <h2 className={styles.titulo}>Próximo do rodízio</h2>
      {erro ? (
        <p className={styles.erro}>{erro}</p>
      ) : (
        <p className={styles.nome}>{proximo ?? "Carregando..."}</p>
      )}
    </Cartao>
  );
}
