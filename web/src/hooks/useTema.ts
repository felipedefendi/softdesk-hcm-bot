import { useCallback, useEffect, useState } from "react";

export type Tema = "dark" | "light";

const CHAVE_STORAGE = "tema";

function temaAtualDoDocumento(): Tema {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/**
 * Le o tema que o script de bootstrap do index.html ja aplicou (evita flash
 * na primeira renderizacao) e permite alternar, persistindo em localStorage.
 */
export function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(temaAtualDoDocumento);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem(CHAVE_STORAGE, tema);
  }, [tema]);

  const alternar = useCallback(() => {
    setTema((atual) => (atual === "dark" ? "light" : "dark"));
  }, []);

  return [tema, alternar];
}
