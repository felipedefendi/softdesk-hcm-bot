import { useState } from "react";
import { Cartao } from "../../components/Cartao";
import { Esqueleto } from "../../components/Esqueleto";
import { ErroCarregamento } from "../../components/ErroCarregamento";
import { filaRodizio } from "../../lib/filaRodizio";
import type { Atendente } from "../../api/tipos";
import styles from "./FilaRodizioCard.module.css";

interface Props {
  atendentes: Atendente[] | null;
  proximo: string | null;
  erro: string | null;
  onTentarNovamente: () => void;
  onDefinirProximo: (nome: string) => Promise<void>;
}

export function FilaRodizioCard({ atendentes, proximo, erro, onTentarNovamente, onDefinirProximo }: Props) {
  const carregando = atendentes === null && proximo === null;
  const ativos = (atendentes ?? []).filter((a) => a.ativo).map((a) => a.nome);
  const fila = filaRodizio(ativos, proximo);

  const [selecionado, setSelecionado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  async function definir() {
    if (!selecionado) return;
    setEnviando(true);
    setErroAcao(null);
    try {
      await onDefinirProximo(selecionado);
      setSelecionado("");
    } catch (err) {
      setErroAcao(err instanceof Error ? err.message : String(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Cartao>
      <h2 className={styles.titulo}>Rodízio</h2>

      {carregando && erro && <ErroCarregamento mensagem={erro} onTentarNovamente={onTentarNovamente} />}
      {carregando && !erro && <Esqueleto linhas={3} />}
      {!carregando && erro && <p className={styles.erro}>{erro}</p>}
      {!carregando && !erro && fila.length === 0 && <p className={styles.vazio}>Rodízio indisponível</p>}

      {fila.length > 0 && (
        <ol className={styles.fila}>
          {fila.map((nome, i) => (
            <li key={nome} className={i === 0 ? styles.proximo : styles.item}>
              {i === 0 && <span className={styles.marca}>Próximo</span>}
              {nome}
            </li>
          ))}
        </ol>
      )}

      <div className={styles.acao}>
        <select
          value={selecionado}
          onChange={(ev) => setSelecionado(ev.target.value)}
          aria-label="Escolher próximo atendente"
        >
          <option value="">Selecione...</option>
          {ativos.map((nome) => (
            <option key={nome} value={nome}>
              {nome}
            </option>
          ))}
        </select>
        <button type="button" onClick={definir} disabled={!selecionado || enviando}>
          Definir como próximo
        </button>
      </div>
      <p className={styles.erro}>{erroAcao ?? ""}</p>
    </Cartao>
  );
}
