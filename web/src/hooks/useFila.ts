import { useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { Fila } from "../api/tipos";

const INTERVALO_MS = 60_000;

/** Alinhado ao cache de 60s do backend (obterFila em src/fila.ts) - poll mais rapido nao traria dado novo. */
export function useFila() {
  const api = useApi();
  const [fila, setFila] = useState<Fila | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const dados = await api<Fila>("/fila");
        if (!cancelado) {
          setFila(dados);
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

  return { fila, erro };
}
