import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { LinhaAuditoria } from "../api/tipos";

/** Log de acoes do painel (admin). Sem polling - conferir sob demanda. */
export function useAuditoria() {
  const api = useApi();
  const [linhas, setLinhas] = useState<LinhaAuditoria[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setLinhas(await api<LinhaAuditoria[]>("/auditoria"));
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { linhas, erro, recarregar };
}
