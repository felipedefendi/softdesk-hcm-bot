import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { CredencialEntrada, CredencialMetadados } from "../api/tipos";

/** Metadados das credenciais (cliente, sistema, link, validade) - nunca inclui login/senha. */
export function useCofreCredenciais() {
  const api = useApi();
  const [credenciais, setCredenciais] = useState<CredencialMetadados[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const dados = await api<CredencialMetadados[]>("/cofre/credenciais");
      setCredenciais(dados);
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const criar = useCallback(
    async (entrada: CredencialEntrada) => {
      await api<CredencialMetadados>("/cofre/credenciais", { method: "POST", body: JSON.stringify(entrada) });
      await recarregar();
    },
    [api, recarregar]
  );

  const editar = useCallback(
    async (id: string, entrada: CredencialEntrada) => {
      await api<CredencialMetadados>(`/cofre/credenciais/${id}`, { method: "PATCH", body: JSON.stringify(entrada) });
      await recarregar();
    },
    [api, recarregar]
  );

  const arquivar = useCallback(
    async (id: string) => {
      const dados = await api<CredencialMetadados[]>(`/cofre/credenciais/${id}/arquivar`, { method: "POST" });
      setCredenciais(dados);
    },
    [api]
  );

  return { credenciais, erro, criar, editar, arquivar };
}
