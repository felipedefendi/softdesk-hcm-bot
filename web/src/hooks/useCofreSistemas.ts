import { useEffect, useState } from "react";
import { useApi } from "../api/useApi";
import type { Sistema } from "../api/tipos";

/** Sem polling - catalogo muda raramente. */
export function useCofreSistemas() {
  const api = useApi();
  const [sistemas, setSistemas] = useState<Sistema[] | null>(null);

  useEffect(() => {
    api<Sistema[]>("/cofre/sistemas")
      .then(setSistemas)
      .catch(() => setSistemas([]));
  }, [api]);

  return sistemas;
}
