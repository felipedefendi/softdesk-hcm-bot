import { useEffect, useId, useRef } from "react";
import styles from "./DialogoConfirmacao.module.css";

interface Props {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  /** Rotulo do botao que confirma. Fica com o estilo de acao destrutiva. */
  textoConfirmar?: string;
  textoCancelar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Confirmacao no visual do painel, no lugar do window.confirm do navegador.
 * O foco abre no "Nao" (a opcao segura); Esc ou clique fora cancelam; Tab fica
 * preso entre os dois botoes enquanto aberto.
 */
export function DialogoConfirmacao({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = "Sim",
  textoCancelar = "Não",
  onConfirmar,
  onCancelar,
}: Props) {
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const confirmarRef = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();
  const idMensagem = useId();

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    cancelarRef.current?.focus();

    function aoTeclar(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        onCancelar();
        return;
      }
      if (ev.key !== "Tab") return;
      ev.preventDefault();
      const destino = document.activeElement === cancelarRef.current ? confirmarRef.current : cancelarRef.current;
      destino?.focus();
    }

    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      anterior?.focus();
    };
  }, [aberto, onCancelar]);

  if (!aberto) return null;

  return (
    <div className={styles.fundo} onClick={onCancelar}>
      <div
        className={styles.caixa}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idMensagem}
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id={idTitulo} className={styles.titulo}>
          {titulo}
        </h2>
        <p id={idMensagem} className={styles.mensagem}>
          {mensagem}
        </p>
        <div className={styles.acoes}>
          <button ref={cancelarRef} type="button" className="botao-secundario" onClick={onCancelar}>
            {textoCancelar}
          </button>
          <button ref={confirmarRef} type="button" className="botao-perigo" onClick={onConfirmar}>
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
