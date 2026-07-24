import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { Automacao } from "../api/tipos";

const INTERVALO_MS = 30_000;

/**
 * Chip do header e o toggle da Visao geral usam o mesmo hook, cada um com o
 * proprio polling (sem estado global) - ver "sem biblioteca de estado global"
 * no prompt do redesign.
 */
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

  const pausar = useCallback(async () => {
    const dados = await api<Automacao>("/automacao/pausar", { method: "POST" });
    setAtiva(dados.ativa);
  }, [api]);

  const retomar = useCallback(async () => {
    const dados = await api<Automacao>("/automacao/retomar", { method: "POST" });
    setAtiva(dados.ativa);
  }, [api]);

  return { ativa, pausar, retomar };
}
