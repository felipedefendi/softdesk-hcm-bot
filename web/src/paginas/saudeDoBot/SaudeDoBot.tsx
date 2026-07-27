import { useMemo } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { Cartao } from "../../components/Cartao";
import { Esqueleto } from "../../components/Esqueleto";
import { ErroCarregamento } from "../../components/ErroCarregamento";
import { useStatus } from "../../hooks/useStatus";
import { useConfiguracoes } from "../../hooks/useConfiguracoes";
import { useExecucoes } from "../../hooks/useExecucoes";
import { estaAtrasada, truncar } from "../../lib/saudeBot";
import { agruparProcessadosPorDia } from "../../lib/agruparProcessadosPorDia";
import { formatarData } from "../../lib/formatarData";
import { GraficoProcessados } from "./GraficoProcessados";
import styles from "./SaudeDoBot.module.css";

const DIAS_GRAFICO = 14;
const MAX_LINHA_DO_TEMPO = 20;
const MAX_ERROS = 10;
const MAX_CHARS_ERRO = 120;

function formatarDuracao(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function SaudeDoBot() {
  const { status } = useStatus();
  const { config } = useConfiguracoes();
  const { execucoes, erro, recarregar } = useExecucoes();

  const atrasada = status !== null && config !== null && estaAtrasada(status.ultimaExecucao, config.pollIntervalMinutes, new Date());

  const recentes = useMemo(() => (execucoes ? [...execucoes].reverse() : []), [execucoes]);
  const linhaDoTempo = recentes.slice(0, MAX_LINHA_DO_TEMPO);
  const comErro = useMemo(() => recentes.filter((e) => e.erro !== null).slice(0, MAX_ERROS), [recentes]);

  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const grafico = useMemo(() => (execucoes ? agruparProcessadosPorDia(execucoes, hoje, DIAS_GRAFICO) : []), [execucoes, hoje]);

  return (
    <div className={styles.pagina}>
      {atrasada && (
        <div className={styles.banner}>
          <AlertTriangle size={18} strokeWidth={1.5} />
          <span>A última execução está atrasada — pode ser sinal de que a automação parou. Vale conferir.</span>
        </div>
      )}

      <Cartao>
        <h2 className={styles.titulo}>Chamados processados (14 dias)</h2>
        {!execucoes && !erro && <Esqueleto linhas={1} altura="90px" />}
        {execucoes && <GraficoProcessados dados={grafico} />}
      </Cartao>

      <Cartao>
        <h2 className={styles.titulo}>Linha do tempo</h2>
        {!execucoes && erro && <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />}
        {!execucoes && !erro && <Esqueleto linhas={4} />}
        {execucoes && execucoes.length === 0 && <p className={styles.vazio}>Nenhuma execução registrada ainda.</p>}

        {linhaDoTempo.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Duração</th>
                <th>Processados</th>
                <th>Erro</th>
              </tr>
            </thead>
            <tbody>
              {linhaDoTempo.map((e, i) => (
                <tr key={i}>
                  <td data-rotulo="Quando">{formatarData(e.inicio)}</td>
                  <td data-rotulo="Duração">{formatarDuracao(e.duracaoMs)}</td>
                  <td data-rotulo="Processados">{e.processados}</td>
                  <td data-rotulo="Erro">{e.erro ? truncar(e.erro, MAX_CHARS_ERRO) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>

      <Cartao>
        <h2 className={styles.titulo}>Erros recentes</h2>

        {execucoes && comErro.length === 0 && (
          <div className={styles.semErros}>
            <Inbox size={28} strokeWidth={1.5} />
            <p>Nenhum erro recente.</p>
          </div>
        )}

        {comErro.length > 0 && (
          <ul className={styles.listaErros}>
            {comErro.map((e, i) => (
              <li key={i} className={styles.itemErro}>
                <span className={styles.erroQuando}>{formatarData(e.inicio)}</span>
                <span className={styles.erroTexto}>{truncar(e.erro ?? "", MAX_CHARS_ERRO)}</span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
