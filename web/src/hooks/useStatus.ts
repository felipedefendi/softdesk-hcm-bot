import { useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { StatusExecucao } from "../api/tipos";

const INTERVALO_MS = 30_000;

export function useStatus() {
  const api = useApi();
  const [status, setStatus] = useState<StatusExecucao | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const dados = await api<StatusExecucao>("/status");
        if (!cancelado) setStatus(dados);
      } catch {
        // Silencioso - o proximo poll tenta de novo.
      }
    }

    carregar();
    const id = setInterval(carregar, INTERVALO_MS);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [api]);

  return status;
}
