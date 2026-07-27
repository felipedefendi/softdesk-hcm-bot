import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./DrawerLateral.module.css";

interface Props {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}

const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function DrawerLateral({ aberto, titulo, onFechar, children }: Props) {
  const drawerRef = useRef<HTMLElement>(null);
  const elementoAnterior = useRef<HTMLElement | null>(null);

  // Escape fecha; Tab/Shift+Tab ficam presos dentro do drawer enquanto ele estiver aberto.
  useEffect(() => {
    if (!aberto) return;

    function aoTeclar(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        onFechar();
        return;
      }
      if (ev.key !== "Tab" || !drawerRef.current) return;

      const focaveis = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL));
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (ev.shiftKey && document.activeElement === primeiro) {
        ev.preventDefault();
        ultimo.focus();
      } else if (!ev.shiftKey && document.activeElement === ultimo) {
        ev.preventDefault();
        primeiro.focus();
      }
    }

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, onFechar]);

  // Foco entra no drawer ao abrir e volta pra quem o abriu ao fechar.
  useEffect(() => {
    if (!aberto) return;

    elementoAnterior.current = document.activeElement as HTMLElement | null;
    const primeiroFocavel = drawerRef.current?.querySelector<HTMLElement>(SELETOR_FOCAVEL);
    (primeiroFocavel ?? drawerRef.current)?.focus();

    return () => {
      elementoAnterior.current?.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div className={styles.fundo} onClick={onFechar}>
      <aside
        ref={drawerRef}
        className={styles.drawer}
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
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
