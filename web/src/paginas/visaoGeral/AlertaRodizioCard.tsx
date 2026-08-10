import { useAlertaRodizio } from "../../hooks/useAlertaRodizio";
import styles from "./AlertaRodizioCard.module.css";

/**
 * So alerta quando ALGUNS ativos (nao todos) passaram o limite sem receber via
 * rodizio. Quem nunca apareceu no log (usa outro fluxo) e ignorado pelo backend
 * desde alertaRodizio.ts, entao aqui nao precisamos mais filtrar.
 */
export function AlertaRodizioCard() {
  const alerta = useAlertaRodizio();

  if (!alerta || alerta.atendentes.length === 0) return null;

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
            {a.atendente} — sem receber há {a.diasUteis} dias úteis
          </li>
        ))}
      </ul>
    </section>
  );
}
