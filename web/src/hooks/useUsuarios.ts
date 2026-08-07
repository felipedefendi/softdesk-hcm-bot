import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { NovoUsuarioEntrada, UsuarioAdmin } from "../api/tipos";

/** Gestao de usuarios (admin). Sem polling - cadastro muda por acao de quem esta na tela. */
export function useUsuarios() {
  const api = useApi();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setUsuarios(await api<UsuarioAdmin[]>("/usuarios"));
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  /** Cria a conta na allowlist; a pessoa entra pela Senior (sem convite/senha). */
  const criar = useCallback(
    async (entrada: NovoUsuarioEntrada): Promise<void> => {
      await api("/usuarios", { method: "POST", body: JSON.stringify(entrada) });
      await recarregar();
    },
    [api, recarregar]
  );

  const mudarPapel = useCallback(
    async (id: string, papel: "admin" | "comum") => {
      setUsuarios(await api<UsuarioAdmin[]>(`/usuarios/${id}`, { method: "PATCH", body: JSON.stringify({ papel }) }));
    },
    [api]
  );

  const mudarEmail = useCallback(
    async (id: string, email: string) => {
      setUsuarios(await api<UsuarioAdmin[]>(`/usuarios/${id}`, { method: "PATCH", body: JSON.stringify({ email }) }));
    },
    [api]
  );

  const desativar = useCallback(
    async (id: string) => {
      setUsuarios(await api<UsuarioAdmin[]>(`/usuarios/${id}`, { method: "PATCH", body: JSON.stringify({ ativo: false }) }));
    },
    [api]
  );

  const reativar = useCallback(
    async (id: string) => {
      setUsuarios(await api<UsuarioAdmin[]>(`/usuarios/${id}`, { method: "PATCH", body: JSON.stringify({ ativo: true }) }));
    },
    [api]
  );

  return { usuarios, erro, recarregar, criar, mudarPapel, mudarEmail, desativar, reativar };
}
