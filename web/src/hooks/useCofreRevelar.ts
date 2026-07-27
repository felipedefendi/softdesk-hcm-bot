import { useCallback, useState } from "react";
import { useApi } from "../api/useApi";
import type { CredencialRevelada } from "../api/tipos";

/** Revela login/senha sob demanda (exige destrave valido no backend) - nunca guarda o resultado em estado. */
export function useCofreRevelar() {
  const api = useApi();
  const [carregandoId, setCarregandoId] = useState<string | null>(null);

  const revelar = useCallback(
    async (id: string): Promise<CredencialRevelada> => {
      setCarregandoId(id);
      try {
        return await api<CredencialRevelada>(`/cofre/credenciais/${id}/revelar`);
      } finally {
        setCarregandoId(null);
      }
    },
    [api]
  );

  return { revelar, carregandoId };
}
