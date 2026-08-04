import { useState, type FormEvent } from "react";
import type { Atendente, Ferias } from "../../api/tipos";
import styles from "./Formularios.module.css";

interface Props {
  atendentes: Atendente[];
  /** Dia clicado na grade, se veio de lá - vira o inicio sugerido. */
  dataInicial: string;
  onSalvar: (nova: Omit<Ferias, "id">) => Promise<string[]>;
  onCancelar: () => void;
}

function formatarDataCurta(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function FormularioFerias({ atendentes, dataInicial, onSalvar, onCancelar }: Props) {
  const [atendente, setAtendente] = useState(atendentes[0]?.nome ?? "");
  const [inicio, setInicio] = useState(dataInicial);
  const [fim, setFim] = useState(dataInicial);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const semNinguem = await onSalvar({ atendente, inicio, fim, observacao: observacao || undefined });

      // Aviso depois de salvar, nao antes: deixar a equipe inteira fora pode ser
      // proposital (recesso), entao isto informa - nao impede.
      if (semNinguem.length > 0) {
        const dias = semNinguem.map(formatarDataCurta).join(", ");
        window.alert(
          `Férias salvas.\n\nAtenção: nestes dias não sobra ninguém no rodízio — ${dias}.\n\n` +
            "Se algum chamado chegar, o bot vai registrar erro em vez de encaminhar."
        );
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <label className={styles.campo}>
        Atendente
        <select value={atendente} onChange={(ev) => setAtendente(ev.target.value)} required>
          {atendentes.map((a) => (
            <option key={a.nome} value={a.nome}>
              {a.nome}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.linha}>
        <label className={styles.campo}>
          Primeiro dia
          <input type="date" value={inicio} onChange={(ev) => setInicio(ev.target.value)} required />
        </label>
        <label className={styles.campo}>
          Último dia
          <input type="date" value={fim} onChange={(ev) => setFim(ev.target.value)} required />
        </label>
      </div>

      <label className={styles.campo}>
        Observação <span className={styles.opcional}>(opcional)</span>
        <input value={observacao} onChange={(ev) => setObservacao(ev.target.value)} />
      </label>

      {erro && <p className={styles.erro}>{erro}</p>}

      <div className={styles.acoes}>
        <button type="submit" disabled={enviando || !atendente}>
          {enviando ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" className="botao-secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
