import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { StatusExecucao } from "../api/tipos";

const INTERVALO_MS = 30_000;

export function useStatus() {
  const api = useApi();
  const [status, setStatus] = useState<StatusExecucao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const dados = await api<StatusExecucao>("/status");
      setStatus(dados);
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [carregar]);

  return { status, erro, recarregar: carregar };
}
