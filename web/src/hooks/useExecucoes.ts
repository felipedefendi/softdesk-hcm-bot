import { useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { Execucao } from "../api/tipos";

const INTERVALO_MS = 30_000;

/** Historico completo (o backend nao pagina) - mais recente por ultimo, igual foi gravado. */
export function useExecucoes() {
  const api = useApi();
  const [execucoes, setExecucoes] = useState<Execucao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const dados = await api<Execucao[]>("/execucoes");
        if (!cancelado) {
          setExecucoes(dados);
          setErro(null);
        }
      } catch (err) {
        if (!cancelado) setErro(err instanceof Error ? err.message : String(err));
      }
    }

    carregar();
    const id = setInterval(carregar, INTERVALO_MS);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [api]);

  return { execucoes, erro };
}
