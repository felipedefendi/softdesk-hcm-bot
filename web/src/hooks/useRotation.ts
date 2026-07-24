import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { Rotation } from "../api/tipos";

const INTERVALO_MS = 30_000;

interface Opcoes {
  /** Visao geral acompanha ao vivo (30s); Rodizio & equipe so recarrega apos cada acao, pra nao atrapalhar quem esta editando. */
  comPoll?: boolean;
}

export function useRotation(opcoes: Opcoes = {}) {
  const api = useApi();
  const [proximo, setProximo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const dados = await api<Rotation>("/rotation");
      setProximo(dados.proximo);
      setErro(null);
    } catch (err) {
      setProximo(null);
      setErro(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    recarregar();
    if (!opcoes.comPoll) return;
    const id = setInterval(recarregar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [recarregar, opcoes.comPoll]);

  const definirProximo = useCallback(
    async (nome: string) => {
      const dados = await api<Rotation>("/rotation/proximo", {
        method: "POST",
        body: JSON.stringify({ nome }),
      });
      setProximo(dados.proximo);
    },
    [api]
  );

  return { proximo, erro, recarregar, definirProximo };
}
