import { useCallback } from "react";
import { api, ErroNaoAutenticado } from "./cliente";
import { useAuth } from "../auth/AuthContext";

/** Igual ao api() cru, mas desloga automaticamente (contexto de auth) quando o cookie expirou em segundo plano. */
export function useApi() {
  const { marcarDeslogado } = useAuth();

  return useCallback(
    async <T,>(caminho: string, opcoes?: RequestInit): Promise<T> => {
      try {
        return await api<T>(caminho, opcoes);
      } catch (err) {
        if (err instanceof ErroNaoAutenticado) marcarDeslogado();
        throw err;
      }
    },
    [marcarDeslogado]
  );
}
