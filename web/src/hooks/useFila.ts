import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { Fila } from "../api/tipos";

const INTERVALO_MS = 60_000;

/** Alinhado ao cache de 60s do backend (obterFila em src/fila.ts) - poll mais rapido nao traria dado novo. */
export function useFila() {
  const api = useApi();
  const [fila, setFila] = useState<Fila | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const dados = await api<Fila>("/fila");
      setFila(dados);
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

  return { fila, erro, recarregar: carregar };
}
