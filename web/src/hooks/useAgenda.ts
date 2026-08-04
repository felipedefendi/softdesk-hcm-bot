import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { Agenda, DiaEspecial, Ferias, FeriadoSugerido, FeriasSalvas } from "../api/tipos";

/** Ferias e dias especiais. Sem polling - cadastro muda por acao de quem esta olhando. */
export function useAgenda() {
  const api = useApi();
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setAgenda(await api<Agenda>("/agenda"));
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  /** Aceita um dia ou varios - o botao de feriados manda a lista conferida de uma vez. */
  const salvarDias = useCallback(
    async (dias: DiaEspecial | DiaEspecial[]) => {
      const diasEspeciais = await api<DiaEspecial[]>("/agenda/dias-especiais", {
        method: "POST",
        body: JSON.stringify(dias),
      });
      setAgenda((atual) => (atual ? { ...atual, diasEspeciais } : atual));
    },
    [api]
  );

  const removerDia = useCallback(
    async (data: string) => {
      const diasEspeciais = await api<DiaEspecial[]>(`/agenda/dias-especiais/${data}`, { method: "DELETE" });
      setAgenda((atual) => (atual ? { ...atual, diasEspeciais } : atual));
    },
    [api]
  );

  /** Devolve os dias em que o rodizio ficaria sem ninguem - aviso, nao impedimento. */
  const salvarFerias = useCallback(
    async (nova: Omit<Ferias, "id"> & { id?: string }): Promise<string[]> => {
      const resposta = await api<FeriasSalvas>("/agenda/ferias", { method: "POST", body: JSON.stringify(nova) });
      setAgenda((atual) => (atual ? { ...atual, ferias: resposta.ferias } : atual));
      return resposta.avisoSemNinguem;
    },
    [api]
  );

  const removerFerias = useCallback(
    async (id: string) => {
      const ferias = await api<Ferias[]>(`/agenda/ferias/${id}`, { method: "DELETE" });
      setAgenda((atual) => (atual ? { ...atual, ferias } : atual));
    },
    [api]
  );

  const sugerirFeriados = useCallback(
    (ano: number) => api<FeriadoSugerido[]>(`/agenda/feriados-sugeridos?ano=${ano}`),
    [api]
  );

  return { agenda, erro, recarregar, salvarDias, removerDia, salvarFerias, removerFerias, sugerirFeriados };
}
