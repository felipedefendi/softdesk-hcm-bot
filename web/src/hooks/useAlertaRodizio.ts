import { useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { AlertaRodizio } from "../api/tipos";

const INTERVALO_MS = 30_000;

export function useAlertaRodizio() {
  const api = useApi();
  const [alerta, setAlerta] = useState<AlertaRodizio | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const dados = await api<AlertaRodizio>("/alerta-rodizio");
        if (!cancelado) setAlerta(dados);
      } catch {
        // Silencioso - o alerta e um extra, nao deve travar a Visao geral.
      }
    }

    carregar();
    const id = setInterval(carregar, INTERVALO_MS);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [api]);

  return alerta;
}
