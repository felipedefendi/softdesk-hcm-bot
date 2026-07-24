import { useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { EntradaLog } from "../api/tipos";

const INTERVALO_MS = 30_000;

/** Devolve o historico inteiro (o backend nao pagina) - cada pagina decide quanto mostrar. */
export function useLog() {
  const api = useApi();
  const [entradas, setEntradas] = useState<EntradaLog[] | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const dados = await api<EntradaLog[]>("/log");
        if (!cancelado) setEntradas(dados);
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

  return entradas;
}
