import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { Atendente } from "../api/tipos";

/** Sem polling automatico - a tela e de edicao ativa (arrastar, ativar/desativar); recarrega so apos cada acao confirmada. */
export function useAtendentes() {
  const api = useApi();
  const [atendentes, setAtendentes] = useState<Atendente[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const dados = await api<Atendente[]>("/atendentes");
      setAtendentes(dados);
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const reordenar = useCallback(
    async (ordem: string[]) => {
      const dados = await api<Atendente[]>("/atendentes/ordem", {
        method: "PUT",
        body: JSON.stringify({ ordem }),
      });
      setAtendentes(dados);
    },
    [api]
  );

  const desativar = useCallback(
    async (nome: string, motivo: string, retornaEm: string | null) => {
      const dados = await api<Atendente[]>(`/atendentes/${encodeURIComponent(nome)}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: false, motivo, retornaEm }),
      });
      setAtendentes(dados);
    },
    [api]
  );

  const reativar = useCallback(
    async (nome: string) => {
      const dados = await api<Atendente[]>(`/atendentes/${encodeURIComponent(nome)}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: true }),
      });
      setAtendentes(dados);
    },
    [api]
  );

  return { atendentes, erro, recarregar, reordenar, desativar, reativar };
}
