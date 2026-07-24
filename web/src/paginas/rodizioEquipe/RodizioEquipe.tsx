import { useAtendentes } from "../../hooks/useAtendentes";
import { useRotation } from "../../hooks/useRotation";
import { FilaRodizioCard } from "./FilaRodizioCard";
import { TabelaAtendentes } from "./TabelaAtendentes";
import styles from "./RodizioEquipe.module.css";

export function RodizioEquipe() {
  const { atendentes, erro: erroAtendentes, reordenar, desativar, reativar } = useAtendentes();
  const { proximo, erro: erroRotation, recarregar: recarregarRotation, definirProximo } = useRotation();

  return (
    <div className={styles.pagina}>
      <FilaRodizioCard atendentes={atendentes} proximo={proximo} erro={erroRotation} onDefinirProximo={definirProximo} />
      <TabelaAtendentes
        atendentes={atendentes}
        erro={erroAtendentes}
        onReordenar={reordenar}
        onDesativar={desativar}
        onReativar={reativar}
        onMudou={recarregarRotation}
      />
    </div>
  );
}
