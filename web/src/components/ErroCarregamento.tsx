import styles from "./ErroCarregamento.module.css";

interface Props {
  mensagem: string;
  onTentarNovamente: () => void;
}

/** Erro de carregamento com saida: mensagem amigavel + acao pra tentar de novo, sem travar a tela. */
export function ErroCarregamento({ mensagem, onTentarNovamente }: Props) {
  return (
    <div className={styles.erro}>
      <p className={styles.mensagem}>Não foi possível carregar. {mensagem}</p>
      <button type="button" className="botao-secundario" onClick={onTentarNovamente}>
        Tentar novamente
      </button>
    </div>
  );
}
