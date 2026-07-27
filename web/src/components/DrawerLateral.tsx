import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./DrawerLateral.module.css";

interface Props {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}

export function DrawerLateral({ aberto, titulo, onFechar, children }: Props) {
  useEffect(() => {
    if (!aberto) return;

    function aoTeclar(ev: KeyboardEvent) {
      if (ev.key === "Escape") onFechar();
    }

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div className={styles.fundo} onClick={onFechar}>
      <aside
        className={styles.drawer}
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className={styles.cabecalho}>
          <h2 className={styles.titulo}>{titulo}</h2>
          <button type="button" className={styles.fechar} onClick={onFechar} aria-label="Fechar">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className={styles.corpo}>{children}</div>
      </aside>
    </div>
  );
}
