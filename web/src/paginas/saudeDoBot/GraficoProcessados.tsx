import type { DiaProcessados } from "../../lib/agruparProcessadosPorDia";
import styles from "./GraficoProcessados.module.css";

interface Props {
  dados: DiaProcessados[];
}

const LARGURA_DIA = 20;
const ALTURA = 80;

function formatarDiaCurto(dia: string): string {
  const [, mes, dd] = dia.split("-");
  return `${dd}/${mes}`;
}

export function GraficoProcessados({ dados }: Props) {
  if (dados.length === 0) return null;

  const max = Math.max(1, ...dados.map((d) => d.total));
  const largura = dados.length * LARGURA_DIA;

  return (
    <div className={styles.wrapper}>
      <svg
        viewBox={`0 0 ${largura} ${ALTURA}`}
        preserveAspectRatio="none"
        className={styles.grafico}
        role="img"
        aria-label={`Chamados processados por dia, últimos ${dados.length} dias`}
      >
        {dados.map((d, i) => {
          const alturaBarra = (d.total / max) * (ALTURA - 16);
          return (
            <rect
              key={d.dia}
              x={i * LARGURA_DIA + 3}
              y={ALTURA - alturaBarra}
              width={LARGURA_DIA - 6}
              height={Math.max(alturaBarra, 1)}
              rx={2}
              className={d.total > 0 ? styles.barra : styles.barraVazia}
            >
              <title>{`${formatarDiaCurto(d.dia)}: ${d.total} processado(s)`}</title>
            </rect>
          );
        })}
      </svg>
      <div className={styles.legenda}>
        <span>{formatarDiaCurto(dados[0].dia)}</span>
        <span>{formatarDiaCurto(dados[dados.length - 1].dia)}</span>
      </div>
    </div>
  );
}
