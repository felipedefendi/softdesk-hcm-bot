import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Layout } from "./components/layout/Layout";
import { Login } from "./paginas/Login";
import { CarregandoSessao } from "./paginas/CarregandoSessao";
import { VisaoGeral } from "./paginas/visaoGeral/VisaoGeral";
import { FilaAoVivo } from "./paginas/FilaAoVivo";
import { RodizioEquipe } from "./paginas/rodizioEquipe/RodizioEquipe";
import { Historico } from "./paginas/historico/Historico";
import { SaudeDoBot } from "./paginas/SaudeDoBot";
import { Cofre } from "./paginas/cofre/Cofre";
import { Configuracoes } from "./paginas/configuracoes/Configuracoes";

function Conteudo() {
  const { autenticado } = useAuth();

  if (autenticado === null) return <CarregandoSessao />;
  if (!autenticado) return <Login />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<VisaoGeral />} />
          <Route path="/fila" element={<FilaAoVivo />} />
          <Route path="/equipe" element={<RodizioEquipe />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/saude" element={<SaudeDoBot />} />
          <Route path="/cofre" element={<Cofre />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Conteudo />
    </AuthProvider>
  );
}
