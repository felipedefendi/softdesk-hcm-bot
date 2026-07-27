import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { Execucao } from "../api/tipos";

const INTERVALO_MS = 30_000;

/** Historico completo (o backend nao pagina) - mais recente por ultimo, igual foi gravado. */
export function useExecucoes() {
  const api = useApi();
  const [execucoes, setExecucoes] = useState<Execucao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const dados = await api<Execucao[]>("/execucoes");
      setExecucoes(dados);
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

  return { execucoes, erro, recarregar: carregar };
}
