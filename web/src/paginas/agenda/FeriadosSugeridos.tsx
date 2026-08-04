import { useEffect, useState } from "react";
import type { DiaEspecial, FeriadoSugerido } from "../../api/tipos";
import styles from "./Formularios.module.css";

interface Props {
  ano: number;
  carregar: (ano: number) => Promise<FeriadoSugerido[]>;
  onAdicionar: (dias: DiaEspecial[]) => Promise<void>;
  onCancelar: () => void;
}

function formatarDataCurta(data: string): string {
  const [, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

function descrever(dia: DiaEspecial): string {
  return dia.tipo === "bloqueado" ? "dia todo" : `${dia.inicio}–${dia.fim}`;
}

/**
 * Lista de conferencia dos feriados nacionais do ano. Propoe, nao grava:
 * segunda de Carnaval, Quarta-feira de Cinzas e Corpus Christi sao politica de
 * empresa, e o codigo nao tem como saber se voces trabalham. Feriado municipal
 * continua sendo cadastro manual - esse ninguem tem como adivinhar.
 */
export function FeriadosSugeridos({ ano, carregar, onAdicionar, onCancelar }: Props) {
  const [sugestoes, setSugestoes] = useState<FeriadoSugerido[] | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    carregar(ano)
      .then((lista) => {
        setSugestoes(lista);
        setMarcadas(new Set(lista.filter((f) => f.marcadoPorPadrao).map((f) => f.dia.data)));
      })
      .catch((err) => setErro(err instanceof Error ? err.message : String(err)));
  }, [ano, carregar]);

  function alternar(data: string) {
    setMarcadas((atual) => {
      const proxima = new Set(atual);
      if (proxima.has(data)) proxima.delete(data);
      else proxima.add(data);
      return proxima;
    });
  }

  async function adicionar() {
    if (!sugestoes) return;
    setErro(null);
    setEnviando(true);
    try {
      await onAdicionar(sugestoes.filter((f) => marcadas.has(f.dia.data)).map((f) => f.dia));
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setEnviando(false);
    }
  }

  if (erro && !sugestoes) return <p className={styles.erro}>{erro}</p>;
  if (!sugestoes) return <p className={styles.aviso}>Calculando os feriados de {ano}...</p>;

  if (sugestoes.length === 0) {
    return (
      <div className={styles.form}>
        <p className={styles.aviso}>Todos os feriados nacionais de {ano} já estão cadastrados.</p>
        <div className={styles.acoes}>
          <button type="button" className="botao-secundario" onClick={onCancelar}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <p className={styles.aviso}>
        Confira antes de adicionar. Os pontos facultativos vêm desmarcados porque variam de empresa para empresa.
      </p>

      <ul className={styles.listaSugestoes}>
        {sugestoes.map(({ dia, marcadoPorPadrao }) => (
          <li key={dia.data}>
            <label className={styles.opcao}>
              <input type="checkbox" checked={marcadas.has(dia.data)} onChange={() => alternar(dia.data)} />
              <span>
                <strong>
                  {formatarDataCurta(dia.data)} — {dia.motivo}
                </strong>
                <small>
                  {descrever(dia)}
                  {!marcadoPorPadrao && " · ponto facultativo"}
                </small>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {erro && <p className={styles.erro}>{erro}</p>}

      <div className={styles.acoes}>
        <button type="button" onClick={adicionar} disabled={enviando || marcadas.size === 0}>
          {enviando ? "Adicionando..." : `Adicionar ${marcadas.size}`}
        </button>
        <button type="button" className="botao-secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
