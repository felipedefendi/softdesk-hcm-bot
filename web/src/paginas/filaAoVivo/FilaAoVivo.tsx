import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { Cartao } from "../../components/Cartao";
import { Esqueleto } from "../../components/Esqueleto";
import { ErroCarregamento } from "../../components/ErroCarregamento";
import { useFila } from "../../hooks/useFila";
import { situacaoSla, formatarDuracaoMinutos } from "../../lib/calcularSla";
import styles from "./FilaAoVivo.module.css";

function segundosDesde(iso: string, agora: Date): number {
  return Math.max(0, Math.round((agora.getTime() - new Date(iso).getTime()) / 1000));
}

export function FilaAoVivo() {
  const { fila, erro, recarregar } = useFila();
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.pagina}>
      <Cartao className={styles.cabecalho}>
        <div>
          <h2 className={styles.titulo}>Fila ao vivo</h2>
          {fila && <p className={styles.atualizado}>Atualizado há {segundosDesde(fila.consultadoEm, agora)}s</p>}
        </div>
        <div className={styles.proximo}>
          <span className={styles.proximoRotulo}>Próximo a receber</span>
          <span className={styles.proximoNome}>{fila?.proximoAtendente ?? "—"}</span>
        </div>
      </Cartao>

      <Cartao>
        {!fila && erro && <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />}
        {!fila && !erro && <Esqueleto linhas={4} />}

        {fila && fila.chamados.length === 0 && (
          <div className={styles.filaLimpa}>
            <Inbox size={32} strokeWidth={1.5} />
            <p>Fila limpa — nenhum chamado esperando atendente.</p>
          </div>
        )}

        {fila && fila.chamados.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Chamado</th>
                <th>Cliente</th>
                <th>Título</th>
                <th>Aberto há</th>
                <th>SLA</th>
              </tr>
            </thead>
            <tbody>
              {fila.chamados.map((item) => {
                const sla = situacaoSla(item.minutosDecorridosSla, fila.limiteMinutos, new Date(fila.consultadoEm), agora);
                const abertoHaMin = (agora.getTime() - new Date(item.abertoEm).getTime()) / 60_000;

                return (
                  <tr key={item.numero}>
                    <td data-rotulo="Chamado">
                      <a href={item.link} target="_blank" rel="noreferrer">
                        #{item.numero}
                      </a>
                    </td>
                    <td data-rotulo="Cliente">{item.cliente}</td>
                    <td data-rotulo="Título">{item.titulo}</td>
                    <td data-rotulo="Aberto há">{formatarDuracaoMinutos(abertoHaMin)}</td>
                    <td data-rotulo="SLA">
                      <span className={sla.status === "estourado" ? styles.badgeEstourado : styles.badgeDentro}>
                        {sla.status === "estourado"
                          ? `Estourado há ${formatarDuracaoMinutos(-sla.minutosRestantes)}`
                          : `${formatarDuracaoMinutos(sla.minutosRestantes)} restantes`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Cartao>
    </div>
  );
}
