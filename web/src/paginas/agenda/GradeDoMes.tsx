import { resumoDoDia, type CelulaDia } from "../../lib/gradeDoMes";
import styles from "./GradeDoMes.module.css";

interface Props {
  semanas: CelulaDia[][];
  /** YYYY-MM-DD, pra destacar o dia corrente. */
  hoje: string;
  onAbrirDia: (data: string) => void;
}

const CABECALHOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "Ana Paula Souza" -> "Ana Paula" - cabe na celula sem virar sopa de letrinhas. */
function nomeCurto(nome: string): string {
  return nome.split(" ").slice(0, 2).join(" ");
}

export function GradeDoMes({ semanas, hoje, onAbrirDia }: Props) {
  return (
    <div className={styles.grade} role="grid" aria-label="Calendário do mês">
      {CABECALHOS.map((rotulo) => (
        <div key={rotulo} className={styles.cabecalho} role="columnheader">
          {rotulo}
        </div>
      ))}

      {semanas.flat().map((celula) => {
        const resumo = resumoDoDia(celula);
        const classes = [
          styles.celula,
          celula.doMes ? "" : styles.foraDoMes,
          celula.fimDeSemana ? styles.fimDeSemana : "",
          celula.data === hoje ? styles.hoje : "",
          celula.especial?.tipo === "bloqueado" ? styles.bloqueado : "",
          celula.especial?.tipo === "janela" ? styles.janela : "",
        ]
          .filter(Boolean)
          .join(" ");

        // O rotulo acessivel carrega o dia inteiro porque as marcas visuais
        // (cor de fundo, chip) nao chegam em leitor de tela.
        const descricao = [
          `Dia ${celula.dia}`,
          celula.especial ? `${resumo} — ${celula.especial.motivo}` : null,
          celula.ferias.length > 0 ? `De férias: ${celula.ferias.map((f) => f.atendente).join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(". ");

        return (
          <button
            key={celula.data}
            type="button"
            role="gridcell"
            className={classes}
            aria-label={descricao}
            aria-current={celula.data === hoje ? "date" : undefined}
            onClick={() => onAbrirDia(celula.data)}
          >
            <span className={styles.numero}>{celula.dia}</span>

            {resumo && <span className={styles.marcaEspecial}>{resumo}</span>}

            {celula.ferias.map((f) => (
              <span key={f.id} className={styles.chipFerias} title={`${f.atendente} — férias`}>
                {nomeCurto(f.atendente)}
              </span>
            ))}
          </button>
        );
      })}
    </div>
  );
}
