import styles from "./EmConstrucao.module.css";

interface Props {
  pagina: string;
}

export function EmConstrucao({ pagina }: Props) {
  return (
    <div className={styles.vazio}>
      <p className={styles.rotulo}>{pagina}</p>
      <p className={styles.texto}>Em construção — chega numa próxima fase do redesign.</p>
    </div>
  );
}
