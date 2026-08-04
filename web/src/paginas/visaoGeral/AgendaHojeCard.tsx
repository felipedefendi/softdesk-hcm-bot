import { CalendarOff, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Cartao } from "../../components/Cartao";
import { useAgendaHoje } from "../../hooks/useAgendaHoje";
import styles from "./AgendaHojeCard.module.css";

/**
 * Faixa que explica por que o revezamento esta parado hoje. Sem ela, um dia
 * bloqueado e indistinguivel de bot quebrado - a Visao geral mostraria zero
 * chamado processado e nenhum motivo.
 */
export function AgendaHojeCard() {
  const estado = useAgendaHoje();

  if (!estado || estado.rodizio === "liberado") return null;

  const bloqueado = estado.rodizio === "bloqueado";

  return (
    <Cartao className={bloqueado ? styles.bloqueado : styles.janela}>
      <div className={styles.conteudo}>
        {bloqueado ? <CalendarOff size={20} strokeWidth={1.5} /> : <Clock size={20} strokeWidth={1.5} />}
        <div>
          <strong className={styles.titulo}>
            {bloqueado ? "Revezamento desligado hoje" : `Fora do horário de hoje (${estado.inicio}–${estado.fim})`}
          </strong>
          <p className={styles.detalhe}>
            {estado.motivo} — chamados novos ficam aguardando e são encaminhados de uma vez quando o expediente
            voltar. <Link to="/agenda">Ver na Agenda</Link>
          </p>
        </div>
      </div>
    </Cartao>
  );
}
