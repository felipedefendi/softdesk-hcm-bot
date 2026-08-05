import { useState } from "react";
import type { Atendente } from "../../api/tipos";
import styles from "./AcaoAtendente.module.css";

interface Props {
  atendente: Atendente;
  /** Falso quando quem esta vendo nao pode mexer nesta linha - nem admin, nem o proprio atendente. */
  podeAgir: boolean;
  onDesativar: (motivo: string, retornaEm: string | null) => Promise<void>;
  onReativar: () => Promise<void>;
}

export function AcaoAtendente({ atendente, podeAgir, onDesativar, onReativar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [retornaEm, setRetornaEm] = useState("");
  const [retornaEmHora, setRetornaEmHora] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Esconder aqui e so conveniencia - o servidor recusa a mesma acao de
  // qualquer forma (ver src/usuarios/permissoes.ts). Sem isso, cada linha
  // mostraria um botao que so falharia ao ser clicado.
  if (!podeAgir) return null;

  if (!atendente.ativo) {
    return (
      <button
        type="button"
        disabled={enviando}
        onClick={async () => {
          setEnviando(true);
          try {
            await onReativar();
          } catch (err) {
            alert(err instanceof Error ? err.message : String(err));
          } finally {
            setEnviando(false);
          }
        }}
      >
        Reativar agora
      </button>
    );
  }

  if (!aberto) {
    return (
      <button type="button" className="botao-secundario" onClick={() => setAberto(true)}>
        Desativar
      </button>
    );
  }

  async function confirmar() {
    setEnviando(true);
    try {
      const retorno = retornaEm
        ? retornaEmHora ? `${retornaEm}T${retornaEmHora}` : retornaEm
        : null;
      await onDesativar(motivo || "Não informado", retorno);
      setAberto(false);
      setMotivo("");
      setRetornaEm("");
      setRetornaEmHora("");
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.painel}>
      <input
        placeholder="Motivo (férias, falta...)"
        value={motivo}
        onChange={(ev) => setMotivo(ev.target.value)}
        className={styles.inputMotivo}
      />
      <input type="date" value={retornaEm} onChange={(ev) => setRetornaEm(ev.target.value)} />
      <input
        type="time"
        value={retornaEmHora}
        onChange={(ev) => setRetornaEmHora(ev.target.value)}
        disabled={!retornaEm}
        title="Hora de retorno (opcional)"
        className={styles.inputHora}
      />
      <button type="button" onClick={confirmar} disabled={enviando}>
        Confirmar
      </button>
      <button type="button" className="botao-secundario" onClick={() => setAberto(false)} disabled={enviando}>
        Cancelar
      </button>
    </div>
  );
}
