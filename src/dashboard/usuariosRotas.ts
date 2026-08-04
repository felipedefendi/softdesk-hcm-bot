import express, { type Request } from "express";
import {
  buscarPorId,
  contarAdminsAtivos,
  criarUsuario,
  desativarUsuario,
  listarUsuarios,
  mudarPapel,
  reativarUsuario,
} from "../usuarios/usuarios";
import { gerarConvitePara } from "../usuarios/convites";
import { exigirPermissao } from "./exigirPermissao";
import { quemEstaAgindo, registrarAcao } from "../auditoria";
import { listarAtendentes } from "../atendentes";
import type { Usuario, Papel } from "../usuarios/tipos";

/**
 * Gestao de usuarios (admin). Montada em /api/usuarios no server.ts, atras
 * do exigirLogin global. Toda a rota aqui exige "usuarios:gerenciar" - por
 * isso o gate e no router inteiro, nao rota a rota.
 */

export const usuariosRouter = express.Router();
usuariosRouter.use(exigirPermissao("usuarios:gerenciar"));

/** Nunca devolve hashSenha/salt - so o que a tela de gestao precisa mostrar. */
function paraPublico(u: Usuario) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    papel: u.papel,
    codigoAtendente: u.codigoAtendente,
    ativo: u.ativo,
    // Convite ainda nao completado = hashSenha vazio (ver criarUsuario). A
    // tela usa isto pra saber se vale a pena oferecer "gerar novo convite".
    temSenha: u.hashSenha !== "",
    bloqueadoAte: u.bloqueadoAte,
    criadoEm: u.criadoEm,
  };
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function idDaSessao(req: Request): string | null {
  return req.sessao?.tipo === "pessoa" ? req.sessao.usuario.id : null;
}

usuariosRouter.get("/", (req, res) => {
  res.json(listarUsuarios().map(paraPublico));
});

usuariosRouter.post("/", (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const nome = texto(b.nome);
  const email = texto(b.email);
  const papel: Papel = b.papel === "admin" ? "admin" : "comum";
  const codigoAtendente = typeof b.codigoAtendente === "number" ? b.codigoAtendente : null;

  if (!nome) {
    res.status(400).json({ erro: "Informe o nome." });
    return;
  }
  if (codigoAtendente !== null && !listarAtendentes().some((a) => a.codigoAtendente === codigoAtendente)) {
    res.status(400).json({ erro: "Atendente vinculado não encontrado." });
    return;
  }

  try {
    const usuario = criarUsuario({ nome, email, papel, codigoAtendente });
    const { token } = gerarConvitePara(usuario.id);
    registrarAcao(quemEstaAgindo(req), "usuario:criar", `${nome} <${email}> - ${papel}`);
    res.json({ usuario: paraPublico(usuario), tokenConvite: token });
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});

/**
 * Gera um novo link de convite pro usuario - reenvio de quem perdeu o
 * primeiro, ou reset de senha (o admin gera um link novo em vez de a pessoa
 * se autoatender, ver "fora de escopo" no PLANO-USUARIOS.md). O convite
 * anterior pendente e automaticamente invalidado (ver gerarConvitePara).
 */
usuariosRouter.post("/:id/convite", (req, res) => {
  const usuario = buscarPorId(req.params.id as string);
  if (!usuario) {
    res.status(404).json({ erro: "Usuário não encontrado." });
    return;
  }

  const { token } = gerarConvitePara(usuario.id);
  registrarAcao(quemEstaAgindo(req), "usuario:gerar-convite", usuario.email);
  res.json({ tokenConvite: token });
});

usuariosRouter.patch("/:id", (req, res) => {
  const id = req.params.id as string;
  const alvo = buscarPorId(id);
  if (!alvo) {
    res.status(404).json({ erro: "Usuário não encontrado." });
    return;
  }

  const b = (req.body ?? {}) as Record<string, unknown>;
  const todos = listarUsuarios();

  // Duas travas contra "trancar a gestao de usuarios pra sempre": ninguem se
  // desativa (nem rebaixa) sozinho, e o ultimo admin ativo nao pode ser
  // desativado nem rebaixado por ninguem - e' o maior risco listado no plano.
  const seDesativandoOuRebaixando =
    (b.ativo === false && alvo.ativo) || (b.papel === "comum" && alvo.papel === "admin");

  if (seDesativandoOuRebaixando) {
    if (alvo.id === idDaSessao(req)) {
      res.status(400).json({ erro: "Você não pode desativar ou rebaixar a própria conta." });
      return;
    }
    if (alvo.papel === "admin" && alvo.ativo && contarAdminsAtivos(todos) <= 1) {
      res.status(400).json({ erro: "Esta é a última conta admin ativa - não é possível desativá-la ou rebaixá-la." });
      return;
    }
  }

  try {
    if (b.papel === "admin" || b.papel === "comum") {
      mudarPapel(id, b.papel);
      registrarAcao(quemEstaAgindo(req), "usuario:mudar-papel", `${alvo.email} -> ${b.papel}`);
    }
    if (b.ativo === false) {
      desativarUsuario(id);
      registrarAcao(quemEstaAgindo(req), "usuario:desativar", alvo.email);
    } else if (b.ativo === true) {
      reativarUsuario(id);
      registrarAcao(quemEstaAgindo(req), "usuario:reativar", alvo.email);
    }
    res.json(listarUsuarios().map(paraPublico));
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
});
