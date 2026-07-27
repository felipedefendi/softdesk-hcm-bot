import { Cartao } from "../../components/Cartao";
import { Esqueleto } from "../../components/Esqueleto";
import { ErroCarregamento } from "../../components/ErroCarregamento";
import { useRotation } from "../../hooks/useRotation";
import styles from "./ProximoCard.module.css";

export function ProximoCard() {
  const { proximo, erro, recarregar } = useRotation({ comPoll: true });

  return (
    <Cartao>
      <h2 className={styles.titulo}>Próximo do rodízio</h2>
      {erro && <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />}
      {!erro && proximo === null && <Esqueleto />}
      {!erro && proximo !== null && <p className={styles.nome}>{proximo}</p>}
    </Cartao>
  );
}
