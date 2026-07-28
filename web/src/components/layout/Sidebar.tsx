import { NavLink } from "react-router-dom";
import { PanelLeftClose, PanelLeft, X } from "lucide-react";
import { PAGINAS } from "../../nav/paginas";
import { Marca } from "../Marca";
import styles from "./Sidebar.module.css";

interface Props {
  colapsada: boolean;
  aoAlternarColapso: () => void;
  drawerAberta: boolean;
  aoFecharDrawer: () => void;
}

export function Sidebar({ colapsada, aoAlternarColapso, drawerAberta, aoFecharDrawer }: Props) {
  return (
    <>
      {drawerAberta && <div className={styles.fundo} onClick={aoFecharDrawer} aria-hidden="true" />}
      <nav
        className={[styles.sidebar, colapsada && styles.colapsada, drawerAberta && styles.drawerAberta]
          .filter(Boolean)
          .join(" ")}
        aria-label="Navegação principal"
      >
        <div className={styles.cabecalho}>
          <div className={styles.marca}>
            <Marca tamanho={20} />
            <span className={styles.marcaTexto}>
              Painel Administrativo
              <small>HCM</small>
            </span>
          </div>
          <button className={styles.fecharDrawer} onClick={aoFecharDrawer} aria-label="Fechar menu" type="button">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <ul className={styles.lista}>
          {PAGINAS.map(({ path, rotulo, Icone }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={path === "/"}
                className={({ isActive }) => [styles.item, isActive && styles.ativo].filter(Boolean).join(" ")}
                onClick={aoFecharDrawer}
              >
                <Icone size={19} strokeWidth={1.5} />
                <span className={styles.rotulo}>{rotulo}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <button
          className={styles.botaoColapsar}
          onClick={aoAlternarColapso}
          type="button"
          aria-label={colapsada ? "Expandir menu" : "Recolher menu"}
        >
          {colapsada ? <PanelLeft size={19} strokeWidth={1.5} /> : <PanelLeftClose size={19} strokeWidth={1.5} />}
          <span className={styles.rotulo}>Recolher</span>
        </button>
      </nav>
    </>
  );
}
