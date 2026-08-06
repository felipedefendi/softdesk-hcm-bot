import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { NovoUsuarioEntrada, UsuarioAdmin, UsuarioCriado } from "../api/tipos";

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

  /** Devolve o token do convite - so aparece agora, o admin precisa copiar antes de fechar a tela. */
  const criar = useCallback(
    async (entrada: NovoUsuarioEntrada): Promise<UsuarioCriado> => {
      const criado = await api<UsuarioCriado>("/usuarios", { method: "POST", body: JSON.stringify(entrada) });
      await recarregar();
      return criado;
    },
    [api, recarregar]
  );

  const gerarNovoConvite = useCallback((id: string) => api<{ tokenConvite: string }>(`/usuarios/${id}/convite`, { method: "POST" }), [api]);

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

  return { usuarios, erro, recarregar, criar, gerarNovoConvite, mudarPapel, mudarEmail, desativar, reativar };
}
