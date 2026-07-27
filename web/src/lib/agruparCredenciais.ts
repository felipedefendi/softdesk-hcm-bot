import type { CredencialMetadados } from "../api/tipos";
import { compararPorValidade } from "./diasParaVencer";

export interface GrupoCredenciais {
  cliente: string;
  credenciais: CredencialMetadados[];
}

/**
 * Filtra por busca (cliente, sistema, link) e agrupa por cliente. Dentro de
 * cada grupo, credenciais ficam ordenadas com o vencimento mais urgente
 * primeiro; os proprios grupos tambem, usando a credencial mais urgente de
 * cada um (ja no topo, por causa da ordenacao interna) como criterio.
 */
export function agruparCredenciais(
  credenciais: CredencialMetadados[],
  busca: string,
  hoje: string,
  nomeSistema: (sistemaId: string) => string
): GrupoCredenciais[] {
  const termo = busca.trim().toLowerCase();

  const filtradas = termo
    ? credenciais.filter((c) => [c.cliente, nomeSistema(c.sistemaId), c.link ?? ""].join(" ").toLowerCase().includes(termo))
    : credenciais;

  const porCliente = new Map<string, CredencialMetadados[]>();
  for (const c of filtradas) {
    const lista = porCliente.get(c.cliente) ?? [];
    lista.push(c);
    porCliente.set(c.cliente, lista);
  }

  const grupos: GrupoCredenciais[] = [...porCliente.entries()].map(([cliente, lista]) => ({
    cliente,
    credenciais: [...lista].sort((a, b) => compararPorValidade(a.validade, b.validade, hoje)),
  }));

  grupos.sort((a, b) => {
    const porValidade = compararPorValidade(a.credenciais[0]?.validade ?? null, b.credenciais[0]?.validade ?? null, hoje);
    return porValidade !== 0 ? porValidade : a.cliente.localeCompare(b.cliente, "pt-BR");
  });

  return grupos;
}
