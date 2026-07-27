import { useState } from "react";
import { Cartao } from "../../components/Cartao";
import { useLog } from "../../hooks/useLog";
import { filtrarHistorico } from "../../lib/filtrarHistorico";
import styles from "./Historico.module.css";

const INCREMENTO = 50;

export function Historico() {
  const entradas = useLog();
  const [busca, setBusca] = useState("");
  const [desde, setDesde] = useState("");
  const [ate, setAte] = useState("");
  const [qtdVisiveis, setQtdVisiveis] = useState(INCREMENTO);

  const filtradas = entradas ? filtrarHistorico(entradas, { busca, desde: desde || null, ate: ate || null }) : [];
  const visiveis = filtradas.slice(0, qtdVisiveis);

  function aoMudarBusca(valor: string) {
    setBusca(valor);
    setQtdVisiveis(INCREMENTO);
  }

  function aoMudarPeriodo(campo: "desde" | "ate", valor: string) {
    if (campo === "desde") setDesde(valor);
    else setAte(valor);
    setQtdVisiveis(INCREMENTO);
  }

  return (
    <Cartao>
      <h2 className={styles.titulo}>Histórico de encaminhamentos</h2>

      <div className={styles.filtros}>
        <input
          type="search"
          placeholder="Buscar por chamado, cliente ou atendente"
          value={busca}
          onChange={(ev) => aoMudarBusca(ev.target.value)}
          className={styles.busca}
          aria-label="Buscar no histórico"
        />
        <label className={styles.campoData}>
          De
          <input type="date" value={desde} onChange={(ev) => aoMudarPeriodo("desde", ev.target.value)} />
        </label>
        <label className={styles.campoData}>
          Até
          <input type="date" value={ate} onChange={(ev) => aoMudarPeriodo("ate", ev.target.value)} />
        </label>
      </div>

      {entradas === null && <p className={styles.vazio}>Carregando...</p>}
      {entradas !== null && filtradas.length === 0 && <p className={styles.vazio}>Nenhum encaminhamento encontrado.</p>}

      {visiveis.length > 0 && (
        <>
          <table>
            <thead>
              <tr>
                <th>Horário</th>
                <th>Chamado</th>
                <th>Cliente / Título</th>
                <th>Atendente</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((e, i) =>
                e.chamado === null ? (
                  <tr key={i}>
                    <td colSpan={4}>{e.linhaOriginal}</td>
                  </tr>
                ) : (
                  <tr key={i}>
                    <td data-rotulo="Horário">{e.horario}</td>
                    <td data-rotulo="Chamado">#{e.chamado}</td>
                    <td data-rotulo="Cliente / Título">{e.clienteETitulo}</td>
                    <td data-rotulo="Atendente">{e.atendente}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>

          {filtradas.length > qtdVisiveis && (
            <div className={styles.acao}>
              <button type="button" className="botao-secundario" onClick={() => setQtdVisiveis((v) => v + INCREMENTO)}>
                Carregar mais
              </button>
            </div>
          )}
        </>
      )}
    </Cartao>
  );
}
