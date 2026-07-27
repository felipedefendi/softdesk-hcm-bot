import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { Configuracoes } from "../api/tipos";

/** Sem polling - tela de formulario, so recarrega apos salvar. */
export function useConfiguracoes() {
  const api = useApi();
  const [config, setConfig] = useState<Configuracoes | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api<Configuracoes>("/configuracoes")
      .then(setConfig)
      .catch((err) => setErro(err instanceof Error ? err.message : String(err)));
  }, [api]);

  const salvar = useCallback(
    async (parcial: Pick<Configuracoes, "pollIntervalMinutes" | "encaminhamentoLimiteMinutos" | "diasSemReceberParaAlerta">) => {
      const dados = await api<Configuracoes>("/configuracoes", {
        method: "PATCH",
        body: JSON.stringify(parcial),
      });
      setConfig(dados);
    },
    [api]
  );

  return { config, erro, salvar };
}
