import type { NextFunction, Request, Response } from "express";
import { podeFazer, type Acao, type Alvo } from "../usuarios/permissoes";

/**
 * Middleware de autorizacao. Monta-se depois de exigirLogin (que preenche
 * req.sessao) e antes do handler da rota. `obterAlvo` so importa pras acoes
 * que dependem de quem e o alvo (ver DEPENDE_DO_ALVO em permissoes.ts) - nas
 * demais e ignorado.
 *
 * Se `obterAlvo` nao acha o alvo (ex.: nome de atendente que nao existe), o
 * jeito seguro e devolver undefined: podeFazer nega pra quem nao e admin e a
 * rota, se chegar a rodar (so pra admin/legado), da o proprio erro de "nao
 * encontrado" que ja tinha antes desta feature.
 */
export function exigirPermissao(acao: Acao, obterAlvo?: (req: Request) => Alvo | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const principal = req.sessao;
    if (!principal || !podeFazer(principal, acao, obterAlvo?.(req))) {
      res.status(403).json({ erro: "Sem permissao para esta acao" });
      return;
    }
    next();
  };
}
