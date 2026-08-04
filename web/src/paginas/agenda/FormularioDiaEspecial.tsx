import { useState, type FormEvent } from "react";
import type { Atendente, DiaEspecial } from "../../api/tipos";
import styles from "./Formularios.module.css";

interface Props {
  data: string;
  existente: DiaEspecial | null;
  /** Pra montar a lista de "quem participa desta escala". */
  atendentes: Atendente[];
  onSalvar: (dia: DiaEspecial) => Promise<void>;
  onRemover: () => Promise<void>;
  onCancelar: () => void;
}

/** Cobre o expediente normal do bot, que vai das 07:00 as 18:55. */
const JANELA_PADRAO = { inicio: "08:00", fim: "19:00" };

const escaladosDoExistente = (existente: DiaEspecial | null): string[] =>
  existente?.tipo === "janela" ? existente.escalados ?? [] : [];

export function FormularioDiaEspecial({ data, existente, atendentes, onSalvar, onRemover, onCancelar }: Props) {
  const [tipo, setTipo] = useState<DiaEspecial["tipo"]>(existente?.tipo ?? "bloqueado");
  const [inicio, setInicio] = useState(existente?.tipo === "janela" ? existente.inicio : JANELA_PADRAO.inicio);
  const [fim, setFim] = useState(existente?.tipo === "janela" ? existente.fim : JANELA_PADRAO.fim);
  const [motivo, setMotivo] = useState(existente?.motivo ?? "");
  // Duas caixas: "restringir a escala?" e, se sim, quem entra. Separadas de
  // proposito - um Set vazio sozinho nao diz se a pessoa nunca abriu a opcao
  // ou se abriu e desmarcou todo mundo (o que o servidor recusa).
  const [restringirEscala, setRestringirEscala] = useState(escaladosDoExistente(existente).length > 0);
  const [escalados, setEscalados] = useState<Set<string>>(new Set(escaladosDoExistente(existente)));
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function alternarEscalado(nome: string) {
    setEscalados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(nome)) proximo.delete(nome);
      else proximo.add(nome);
      return proximo;
    });
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await onSalvar(
        tipo === "bloqueado"
          ? { data, tipo: "bloqueado", motivo }
          : {
              data,
              tipo: "janela",
              inicio,
              fim,
              motivo,
              ...(restringirEscala ? { escalados: [...escalados] } : {}),
            }
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
        <>
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

          <label className={styles.opcaoSimples}>
            <input type="checkbox" checked={restringirEscala} onChange={(ev) => setRestringirEscala(ev.target.checked)} />
            Só uma parte do time entra nesta escala
          </label>

          {restringirEscala && (
            <fieldset className={styles.opcoes}>
              <legend className={styles.legenda}>
                Quem participa {escalados.size > 0 ? `(${escalados.size})` : ""}
              </legend>
              {atendentes.length === 0 && <p className={styles.aviso}>Nenhum atendente cadastrado.</p>}
              <ul className={styles.listaEscalados}>
                {atendentes.map((a) => (
                  <li key={a.codigoAtendente}>
                    <label className={styles.opcaoSimples}>
                      <input
                        type="checkbox"
                        checked={escalados.has(a.nome)}
                        onChange={() => alternarEscalado(a.nome)}
                      />
                      {a.nome}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
        </>
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
        <button type="submit" disabled={enviando || (restringirEscala && escalados.size === 0)}>
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
