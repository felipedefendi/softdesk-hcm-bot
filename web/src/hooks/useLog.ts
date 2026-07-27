import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { EntradaLog } from "../api/tipos";

const INTERVALO_MS = 30_000;

/** Devolve o historico inteiro (o backend nao pagina) - cada pagina decide quanto mostrar. */
export function useLog() {
  const api = useApi();
  const [entradas, setEntradas] = useState<EntradaLog[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const dados = await api<EntradaLog[]>("/log");
      setEntradas(dados);
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

  return { entradas, erro, recarregar: carregar };
}
