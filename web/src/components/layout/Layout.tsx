import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { PAGINAS } from "../../nav/paginas";
import styles from "./Layout.module.css";

export function Layout() {
  const [colapsada, setColapsada] = useState(false);
  const [drawerAberta, setDrawerAberta] = useState(false);
  const location = useLocation();

  const paginaAtual = PAGINAS.find((p) => p.path === location.pathname)?.rotulo ?? "Painel Administrativo - HCM";

  return (
    <div className={styles.shell}>
      <Sidebar
        colapsada={colapsada}
        aoAlternarColapso={() => setColapsada((v) => !v)}
        drawerAberta={drawerAberta}
        aoFecharDrawer={() => setDrawerAberta(false)}
      />
      <div className={styles.principal}>
        <Header titulo={paginaAtual} onAbrirDrawer={() => setDrawerAberta(true)} />
        <main className={styles.conteudo}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
