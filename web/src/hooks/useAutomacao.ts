import { useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { Automacao } from "../api/tipos";

const INTERVALO_MS = 30_000;

/** Chip do header e visivel em toda pagina - polling proprio, independente da rota atual. */
export function useAutomacao() {
  const api = useApi();
  const [ativa, setAtiva] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const dados = await api<Automacao>("/automacao");
        if (!cancelado) setAtiva(dados.ativa);
      } catch {
        // Silencioso: o chip nao deve travar a pagina por causa disso.
      }
    }

    carregar();
    const id = setInterval(carregar, INTERVALO_MS);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [api]);

  return { ativa };
}
