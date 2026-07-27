import styles from "./Esqueleto.module.css";

interface Props {
  /** Numero de linhas do placeholder. A ultima fica mais curta quando ha mais de uma. */
  linhas?: number;
  /** Altura de cada linha (ex.: pra imitar um grafico ou bloco maior em vez de texto). */
  altura?: string;
  className?: string;
}

/** Loading state: bloco estatico na cor da superficie, sem pulso/shimmer - texto real que ainda nao chegou. */
export function Esqueleto({ linhas = 1, altura, className }: Props) {
  return (
    <div className={[styles.grupo, className].filter(Boolean).join(" ")} aria-hidden="true">
      {Array.from({ length: linhas }).map((_, i) => (
        <span
          key={i}
          className={styles.linha}
          style={{ height: altura, width: linhas > 1 && i === linhas - 1 ? "60%" : undefined }}
        />
      ))}
    </div>
  );
}
