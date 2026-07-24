import { useState } from "react";
import type { Atendente } from "../../api/tipos";
import styles from "./AcaoAtendente.module.css";

interface Props {
  atendente: Atendente;
  onDesativar: (motivo: string, retornaEm: string | null) => Promise<void>;
  onReativar: () => Promise<void>;
}

export function AcaoAtendente({ atendente, onDesativar, onReativar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [retornaEm, setRetornaEm] = useState("");
  const [enviando, setEnviando] = useState(false);

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
      await onDesativar(motivo || "Não informado", retornaEm || null);
      setAberto(false);
      setMotivo("");
      setRetornaEm("");
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
      <button type="button" onClick={confirmar} disabled={enviando}>
        Confirmar
      </button>
      <button type="button" className="botao-secundario" onClick={() => setAberto(false)} disabled={enviando}>
        Cancelar
      </button>
    </div>
  );
}
