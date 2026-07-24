export class ErroNaoAutenticado extends Error {
  constructor() {
    super("Nao autenticado");
    this.name = "ErroNaoAutenticado";
  }
}

/** Fetch tipado com o prefixo /api. 401 vira ErroNaoAutenticado; outros erros carregam a mensagem do servidor. */
export async function api<T>(caminho: string, opcoes?: RequestInit): Promise<T> {
  const res = await fetch(`/api${caminho}`, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });

  if (res.status === 401) {
    throw new ErroNaoAutenticado();
  }
  if (!res.ok) {
    const corpo = (await res.json().catch(() => ({}))) as { erro?: string };
    throw new Error(corpo.erro || `Erro HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
