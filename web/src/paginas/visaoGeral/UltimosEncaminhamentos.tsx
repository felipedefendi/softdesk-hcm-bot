import { Cartao } from "../../components/Cartao";
import { useLog } from "../../hooks/useLog";
import styles from "./UltimosEncaminhamentos.module.css";

const QUANTIDADE = 5;

export function UltimosEncaminhamentos() {
  const entradas = useLog();
  const ultimas = entradas?.slice(0, QUANTIDADE) ?? [];

  return (
    <Cartao>
      <h2 className={styles.titulo}>Últimos encaminhamentos</h2>

      {entradas === null && <p className={styles.vazio}>Carregando...</p>}
      {entradas !== null && ultimas.length === 0 && <p className={styles.vazio}>Nenhum encaminhamento ainda.</p>}

      {ultimas.length > 0 && (
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th>Horário</th>
              <th>Chamado</th>
              <th>Cliente / Título</th>
              <th>Atendente</th>
            </tr>
          </thead>
          <tbody>
            {ultimas.map((e, i) =>
              e.chamado === null ? (
                <tr key={i}>
                  <td colSpan={4}>{e.linhaOriginal}</td>
                </tr>
              ) : (
                <tr key={i}>
                  <td>{e.horario}</td>
                  <td>#{e.chamado}</td>
                  <td>{e.clienteETitulo}</td>
                  <td>{e.atendente}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </Cartao>
  );
}
