import { StatusCard } from "./StatusCard";
import { ProximoCard } from "./ProximoCard";
import { AlertaRodizioCard } from "./AlertaRodizioCard";
import { AgendaHojeCard } from "./AgendaHojeCard";
import { UltimosEncaminhamentos } from "./UltimosEncaminhamentos";
import styles from "./VisaoGeral.module.css";

export function VisaoGeral() {
  return (
    <div className={styles.pagina}>
      {/* Antes dos cartoes de status: explica o zero que eles vao mostrar. */}
      <AgendaHojeCard />
      <div className={styles.grade}>
        <StatusCard />
        <ProximoCard />
      </div>
      <AlertaRodizioCard />
      <UltimosEncaminhamentos />
    </div>
  );
}
