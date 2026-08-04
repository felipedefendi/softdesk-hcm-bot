import { useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { EstadoDoDia } from "../api/tipos";

/**
 * O que a Agenda diz sobre agora. Silencioso em caso de erro: e um aviso
 * complementar na Visao geral, e derrubar a tela por causa dele seria pior do
 * que nao mostra-lo.
 */
export function useAgendaHoje() {
  const api = useApi();
  const [estado, setEstado] = useState<EstadoDoDia | null>(null);

  useEffect(() => {
    api<EstadoDoDia>("/agenda/hoje")
      .then(setEstado)
      .catch(() => setEstado(null));
  }, [api]);

  return estado;
}
