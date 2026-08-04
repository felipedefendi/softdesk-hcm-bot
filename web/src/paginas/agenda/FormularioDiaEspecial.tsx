import { useState, type FormEvent } from "react";
import type { DiaEspecial } from "../../api/tipos";
import styles from "./Formularios.module.css";

interface Props {
  data: string;
  existente: DiaEspecial | null;
  onSalvar: (dia: DiaEspecial) => Promise<void>;
  onRemover: () => Promise<void>;
  onCancelar: () => void;
}

/** Cobre o expediente normal do bot, que vai das 07:00 as 18:55. */
const JANELA_PADRAO = { inicio: "08:00", fim: "19:00" };

export function FormularioDiaEspecial({ data, existente, onSalvar, onRemover, onCancelar }: Props) {
  const [tipo, setTipo] = useState<DiaEspecial["tipo"]>(existente?.tipo ?? "bloqueado");
  const [inicio, setInicio] = useState(existente?.tipo === "janela" ? existente.inicio : JANELA_PADRAO.inicio);
  const [fim, setFim] = useState(existente?.tipo === "janela" ? existente.fim : JANELA_PADRAO.fim);
  const [motivo, setMotivo] = useState(existente?.motivo ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await onSalvar(
        tipo === "bloqueado" ? { data, tipo: "bloqueado", motivo } : { data, tipo: "janela", inicio, fim, motivo }
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setEnviando(false);
    }
  }

  async function remover() {
    setEnviando(true);
    try {
      await onRemover();
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
      setEnviando(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <fieldset className={styles.opcoes}>
        <legend className={styles.legenda}>O que acontece neste dia</legend>

        <label className={styles.opcao}>
          <input
            type="radio"
            name="tipo"
            checked={tipo === "bloqueado"}
            onChange={() => setTipo("bloqueado")}
          />
          <span>
            <strong>Sem expediente</strong>
            <small>O revezamento fica desligado o dia todo.</small>
          </span>
        </label>

        <label className={styles.opcao}>
          <input type="radio" name="tipo" checked={tipo === "janela"} onChange={() => setTipo("janela")} />
          <span>
            <strong>Horário diferente</strong>
            <small>Encaminha só dentro da janela abaixo.</small>
          </span>
        </label>
      </fieldset>

      {tipo === "janela" && (
        <div className={styles.linha}>
          <label className={styles.campo}>
            Das
            <input type="time" value={inicio} onChange={(ev) => setInicio(ev.target.value)} required />
          </label>
          <label className={styles.campo}>
            Até
            <input type="time" value={fim} onChange={(ev) => setFim(ev.target.value)} required />
          </label>
        </div>
      )}

      <label className={styles.campo}>
        Motivo
        <input
          value={motivo}
          onChange={(ev) => setMotivo(ev.target.value)}
          placeholder="Feriado municipal, véspera de Natal..."
          required
        />
      </label>

      {erro && <p className={styles.erro}>{erro}</p>}

      <div className={styles.acoes}>
        <button type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" className="botao-secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
        {existente && (
          <button type="button" className={styles.remover} onClick={remover} disabled={enviando}>
            Remover
          </button>
        )}
      </div>
    </form>
  );
}
