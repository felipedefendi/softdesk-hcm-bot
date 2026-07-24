import styles from "./CarregandoSessao.module.css";

/** Tela em branco (sem spinner chamativo) enquanto confere se o cookie de sessao ainda vale. */
export function CarregandoSessao() {
  return <div className={styles.tela} aria-busy="true" />;
}
