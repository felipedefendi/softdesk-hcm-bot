import { StatusCard } from "./StatusCard";
import { ProximoCard } from "./ProximoCard";
import { AlertaRodizioCard } from "./AlertaRodizioCard";
import { UltimosEncaminhamentos } from "./UltimosEncaminhamentos";
import styles from "./VisaoGeral.module.css";

export function VisaoGeral() {
  return (
    <div className={styles.pagina}>
      <div className={styles.grade}>
        <StatusCard />
        <ProximoCard />
      </div>
      <AlertaRodizioCard />
      <UltimosEncaminhamentos />
    </div>
  );
}
