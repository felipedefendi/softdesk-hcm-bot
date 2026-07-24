import { useAlertaRodizio } from "../../hooks/useAlertaRodizio";
import { useAtendentes } from "../../hooks/useAtendentes";
import styles from "./AlertaRodizioCard.module.css";

/**
 * Quando o numero de atendentes sem receber >= total de ativos, o problema
 * nao e um ponteiro travado numa pessoa - e volume baixo (ou o bot parado).
 * Listar cada um individualmente seria enganoso, entao colapsa numa linha so
 * (mesma logica do app.js antigo).
 */
export function AlertaRodizioCard() {
  const alerta = useAlertaRodizio();
  const { atendentes } = useAtendentes();

  if (!alerta || alerta.atendentes.length === 0) return null;

  const totalAtivos = atendentes?.filter((a) => a.ativo).length ?? 0;
  const timeTodoParado = totalAtivos > 0 && alerta.atendentes.length >= totalAtivos;

  return (
    <section className={styles.cartao}>
      <h2 className={styles.titulo}>Possível rodízio travado</h2>

      {timeTodoParado ? (
        <p className={styles.texto}>
          Ninguém recebeu chamado nos últimos {alerta.limite}+ dias úteis. Pode ser volume baixo ou a automação
          parada — vale conferir.
        </p>
      ) : (
        <>
          <p className={styles.texto}>
            Atendente(s) ativo(s) sem receber chamado há {alerta.limite}+ dias úteis. Vale conferir se o rodízio
            está funcionando.
          </p>
          <ul className={styles.lista}>
            {alerta.atendentes.map((a) => (
              <li key={a.atendente}>
                {a.atendente} —{" "}
                {a.diasUteis === null
                  ? "nunca recebeu um chamado pelo rodízio"
                  : `sem receber há ${a.diasUteis} dias úteis`}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
