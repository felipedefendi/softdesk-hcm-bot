import styles from "./Formularios.module.css";

interface Props {
  valor: string;
  onMudar: (valor: string) => void;
}

/**
 * E-mail do Teams do atendente, usado na @mencao do card no canal de
 * revezamento. Nem sempre e o mesmo e-mail da conta (ex.: login "mateus@",
 * Teams "mateus.felipe@"), por isso e pedido a parte.
 */
export function CampoEmailTeams({ valor, onMudar }: Props) {
  return (
    <label className={styles.campo}>
      <span>
        E-mail do Teams <span className={styles.opcional}>(para a marcação no canal de revezamento)</span>
      </span>
      <input
        type="email"
        value={valor}
        onChange={(ev) => onMudar(ev.target.value)}
        placeholder="nome.sobrenome@empresa.com.br"
        autoComplete="off"
        required
      />
    </label>
  );
}
