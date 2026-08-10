import { useAlertaRodizio } from "../../hooks/useAlertaRodizio";
import { useAtendentes } from "../../hooks/useAtendentes";
import styles from "./AlertaRodizioCard.module.css";

/**
 * So alerta quando ALGUNS ativos (nao todos) estao sem receber - o sintoma de
 * um ponteiro travado pulando alguem, que e pra isso que este card existe.
 *
 * Quando o time TODO esta sem receber, nao e rodizio travado: e volume baixo ou
 * nada pra auto-distribuir (os chamados chegam pelo fluxo normal do SoftDesk).
 * Isso nao e defeito e so assustava, entao o card nao aparece nesse caso - se o
 * bot estiver mesmo parado, o card de automacao ja mostra.
 */
export function AlertaRodizioCard() {
  const alerta = useAlertaRodizio();
  const { atendentes } = useAtendentes();

  if (!alerta || alerta.atendentes.length === 0) return null;
  // Sem a lista de ativos nao da pra distinguir "time todo parado" de "skip
  // real", entao espera ela carregar antes de decidir (evita um flash).
  if (!atendentes) return null;

  const totalAtivos = atendentes.filter((a) => a.ativo).length;
  const timeTodoParado = totalAtivos > 0 && alerta.atendentes.length >= totalAtivos;
  if (timeTodoParado) return null;

  return (
    <section className={styles.cartao}>
      <h2 className={styles.titulo}>Possível rodízio travado</h2>
      <p className={styles.texto}>
        Atendente(s) ativo(s) sem receber chamado há {alerta.limite}+ dias úteis. Vale conferir se o rodízio está
        funcionando.
      </p>
      <ul className={styles.lista}>
        {alerta.atendentes.map((a) => (
          <li key={a.atendente}>
            {a.atendente} —{" "}
            {a.diasUteis === null ? "nunca recebeu um chamado pelo rodízio" : `sem receber há ${a.diasUteis} dias úteis`}
          </li>
        ))}
      </ul>
    </section>
  );
}
