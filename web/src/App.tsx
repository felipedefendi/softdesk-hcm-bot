import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { Layout } from "./components/layout/Layout";
import { Login } from "./paginas/Login";
import { CarregandoSessao } from "./paginas/CarregandoSessao";
import { CompletarConvite } from "./paginas/convite/CompletarConvite";
import { VisaoGeral } from "./paginas/visaoGeral/VisaoGeral";
import { FilaAoVivo } from "./paginas/filaAoVivo/FilaAoVivo";
import { RodizioEquipe } from "./paginas/rodizioEquipe/RodizioEquipe";
import { Agenda } from "./paginas/agenda/Agenda";
import { Historico } from "./paginas/historico/Historico";
import { SaudeDoBot } from "./paginas/saudeDoBot/SaudeDoBot";
import { Cofre } from "./paginas/cofre/Cofre";
import { Usuarios } from "./paginas/usuarios/Usuarios";
import { Auditoria } from "./paginas/auditoria/Auditoria";
import { Perfil } from "./paginas/perfil/Perfil";
import { Configuracoes } from "./paginas/configuracoes/Configuracoes";

/**
 * Tudo que exige sessao. Fica atras de /convite/:token de proposito: quem
 * chega por um link de convite ainda nao tem cookie nenhum, e o /api/eu que
 * este bloco depende (via AuthProvider) daria 401 - a pagina do convite
 * precisa ficar fora deste guard, nao dentro dele.
 */
function ConteudoAutenticado() {
  const { autenticado } = useAuth();

  if (autenticado === null) return <CarregandoSessao />;
  if (!autenticado) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<VisaoGeral />} />
        <Route path="/fila" element={<FilaAoVivo />} />
        <Route path="/equipe" element={<RodizioEquipe />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/saude" element={<SaudeDoBot />} />
        <Route path="/cofre" element={<Cofre />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/convite/:token" element={<CompletarConvite />} />
          <Route path="*" element={<ConteudoAutenticado />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
