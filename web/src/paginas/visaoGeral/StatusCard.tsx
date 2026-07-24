import { useState } from "react";
import { Cartao } from "../../components/Cartao";
import { Toggle } from "../../components/Toggle";
import { useStatus } from "../../hooks/useStatus";
import { useAutomacao } from "../../hooks/useAutomacao";
import { useApi } from "../../api/useApi";
import { formatarData } from "../../lib/formatarData";
import type { VerificarAgoraResultado } from "../../api/tipos";
import styles from "./StatusCard.module.css";

export function StatusCard() {
  const status = useStatus();
  const { ativa, pausar, retomar } = useAutomacao();
  const api = useApi();
  const [verificando, setVerificando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  async function alternarAutomacao() {
    try {
      if (ativa) await pausar();
      else await retomar();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  async function forcarVerificacao() {
    setVerificando(true);
    setResultado("Verificando...");
    try {
      const dados = await api<VerificarAgoraResultado>("/verificar-agora", { method: "POST" });
      setResultado(`Concluído: ${dados.processados} chamado(s) processado(s).`);
    } catch (err) {
      setResultado(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setVerificando(false);
    }
  }

  return (
    <Cartao>
      <h2 className={styles.titulo}>Status da automação</h2>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.rotulo}>Última execução</span>
          <span className={styles.valor}>{status ? formatarData(status.ultimaExecucao) : "-"}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.rotulo}>Próxima execução</span>
          <span className={styles.valor}>{status ? formatarData(status.proximaExecucaoPrevista) : "-"}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.rotulo}>Processados</span>
          <span className={styles.valor}>{status?.chamadosProcessadosUltimaExecucao ?? "-"}</span>
        </div>
      </div>

      <p className={styles.erro}>{status?.ultimoErro ? `Último erro: ${status.ultimoErro}` : ""}</p>

      <div className={styles.divisor} />

      <div className={styles.controle}>
        <Toggle ligado={ativa ?? false} onAlternar={alternarAutomacao} ariaLabel="Ativar ou pausar a automação" />
        <span>{ativa ? "Automação ativa" : "Automação pausada"}</span>
      </div>

      <div className={styles.acao}>
        <button type="button" className="botao-secundario" onClick={forcarVerificacao} disabled={verificando}>
          Forçar verificação agora
        </button>
      </div>
      <p className={styles.resultado}>{resultado ?? ""}</p>
    </Cartao>
  );
}
