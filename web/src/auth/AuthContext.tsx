import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/cliente";

interface AuthContextValor {
  /** null = sessao ainda sendo verificada contra a API na carga da pagina. */
  autenticado: boolean | null;
  erroLogin: string | null;
  entrar: (senha: string) => Promise<void>;
  sair: () => Promise<void>;
  marcarDeslogado: () => void;
}

const AuthContext = createContext<AuthContextValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [erroLogin, setErroLogin] = useState<string | null>(null);

  useEffect(() => {
    // Reusa uma rota ja existente e barata pra saber se o cookie de sessao
    // ainda vale, igual o app.js antigo fazia com /api/status na carga.
    api("/status")
      .then(() => setAutenticado(true))
      .catch(() => setAutenticado(false));
  }, []);

  const marcarDeslogado = useCallback(() => setAutenticado(false), []);

  const entrar = useCallback(async (senha: string) => {
    setErroLogin(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    if (!res.ok) {
      const corpo = (await res.json().catch(() => ({}))) as { erro?: string };
      const mensagem = corpo.erro ?? "Falha no login";
      setErroLogin(mensagem);
      throw new Error(mensagem);
    }
    setAutenticado(true);
  }, []);

  const sair = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    setAutenticado(false);
  }, []);

  return (
    <AuthContext.Provider value={{ autenticado, erroLogin, entrar, sair, marcarDeslogado }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
