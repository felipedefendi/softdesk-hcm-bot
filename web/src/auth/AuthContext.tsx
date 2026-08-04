import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/cliente";
import type { Eu } from "../api/tipos";

interface AuthContextValor {
  /** null = sessao ainda sendo verificada contra a API na carga da pagina. */
  autenticado: boolean | null;
  /** Quem esta logado - null antes da checagem inicial ou apos logout. */
  eu: Eu | null;
  erroLogin: string | null;
  entrar: (credenciais: { email?: string; senha: string }) => Promise<void>;
  sair: () => Promise<void>;
  marcarDeslogado: () => void;
}

const AuthContext = createContext<AuthContextValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [eu, setEu] = useState<Eu | null>(null);
  const [erroLogin, setErroLogin] = useState<string | null>(null);

  useEffect(() => {
    // /api/eu resolve as duas perguntas de uma vez: "a sessao ainda vale?" e
    // "quem e essa pessoa?" - antes eram duas rotas (/api/status so pra
    // sondar a sessao, sem usar a resposta).
    api<Eu>("/eu")
      .then((dados) => {
        setEu(dados);
        setAutenticado(true);
      })
      .catch(() => setAutenticado(false));
  }, []);

  const marcarDeslogado = useCallback(() => {
    setAutenticado(false);
    setEu(null);
  }, []);

  const entrar = useCallback(async (credenciais: { email?: string; senha: string }) => {
    setErroLogin(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credenciais),
    });
    if (!res.ok) {
      const corpo = (await res.json().catch(() => ({}))) as { erro?: string };
      const mensagem = corpo.erro ?? "Falha no login";
      setErroLogin(mensagem);
      throw new Error(mensagem);
    }
    setEu(await api<Eu>("/eu"));
    setAutenticado(true);
  }, []);

  const sair = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    setAutenticado(false);
    setEu(null);
  }, []);

  return (
    <AuthContext.Provider value={{ autenticado, eu, erroLogin, entrar, sair, marcarDeslogado }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
