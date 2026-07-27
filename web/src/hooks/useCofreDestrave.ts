import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";

const TTL_MS = 5 * 60 * 1000;

/**
 * Espelha o destrave do backend (cofreRotas.ts): o cookie httpOnly nao e
 * legivel aqui, entao a contagem regressiva e local, comecando do zero a
 * cada "destravar" bem-sucedido. Trancar de verdade (o cookie expirar sem a
 * pagina saber) so aparece na proxima chamada que exigir destrave.
 */
export function useCofreDestrave() {
  const api = useApi();
  const [expiraEm, setExpiraEm] = useState<number | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  useEffect(() => {
    if (expiraEm === null) {
      setSegundosRestantes(0);
      return;
    }

    function atualizar() {
      const restante = Math.max(0, Math.round((expiraEm! - Date.now()) / 1000));
      setSegundosRestantes(restante);
      if (restante === 0) setExpiraEm(null);
    }

    atualizar();
    const id = setInterval(atualizar, 1000);
    return () => clearInterval(id);
  }, [expiraEm]);

  const destravar = useCallback(
    async (senha: string) => {
      await api("/cofre/destravar", { method: "POST", body: JSON.stringify({ senha }) });
      setExpiraEm(Date.now() + TTL_MS);
    },
    [api]
  );

  const trancar = useCallback(async () => {
    await api("/cofre/trancar", { method: "POST" }).catch(() => {});
    setExpiraEm(null);
  }, [api]);

  return { destravado: expiraEm !== null && segundosRestantes > 0, segundosRestantes, destravar, trancar };
}
