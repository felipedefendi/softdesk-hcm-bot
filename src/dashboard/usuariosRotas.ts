import express, { type Request } from "express";
import {
  buscarPorEmail,
  buscarPorId,
  contarAdminsAtivos,
  emailValido,
  normalizarEmail,
  criarUsuario,
  desativarUsuario,
  listarUsuarios,
  mudarCodigoAtendente,
  mudarEmail,
  mudarPapel,
  reativarUsuario,
  usuarioComCodigoAtendente,
} from "../usuarios/usuarios";
import { exigirPermissao } from "./exigirPermissao";
import { ehMaster } from "../usuarios/permissoes";
import { quemEstaAgindo, registrarAcao } from "../auditoria";
import {
  adicionarAtendente,
  listarAtendentes,
  planoDeAtendenteNaNovaConta,
  reativarManualmente,
  type Atendente,
} from "../atendentes";
import type { Usuario, Papel } from "../usuarios/tipos";

/**
 * Gestao de usuarios (admin). Montada em /api/usuarios no server.ts, atras
 * do exigirLogin global. Toda a rota aqui exige "usuarios:gerenciar" - por
 * isso o gate e no router inteiro, nao rota a rota.
 */

export const usuariosRouter = express.Router();
usuariosRouter.use(exigirPermissao("usuarios:gerenciar"));

/** So o que a tela de gestao precisa mostrar. */
function paraPublico(u: Usuario) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    papel: u.papel,
    codigoAtendente: u.codigoAtendente,
    ativo: u.ativo,
    criadoEm: u.criadoEm,
    master: ehMaster(u),
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
  const usuarioAtendente = b.usuarioAtendente === true;

  if (!nome) {
    res.status(400).json({ erro: "Informe o nome." });
    return;
  }

  let plano: ReturnType<typeof planoDeAtendenteNaNovaConta>;
  try {
    plano = planoDeAtendenteNaNovaConta(listarAtendentes(), codigoAtendente, usuarioAtendente);
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
    return;
  }

  const conflitoDeVinculo = codigoAtendente === null
    ? undefined
    : usuarioComCodigoAtendente(listarUsuarios(), codigoAtendente, "");
  if (conflitoDeVinculo) {
    res.status(400).json({ erro: `Este atendente já está vinculado a ${conflitoDeVinculo.nome}.` });
    return;
  }

  if (plano === "criar") {
    // O e-mail e conferido antes de mexer no rodizio: se a conta fosse recusada
    // depois, sobraria um atendente recebendo chamado sem ninguem vinculado.
    if (!emailValido(email)) {
      res.status(400).json({ erro: `E-mail inválido: "${email}"` });
      return;
    }
    if (buscarPorEmail(email)) {
      res.status(400).json({ erro: `Já existe uma conta com o e-mail "${normalizarEmail(email)}".` });
      return;
    }
  }

  try {
    if (plano === "criar") {
      adicionarAtendente({
        nome,
        codigoAtendente: codigoAtendente as number,
        ativo: true,
        motivoInatividade: null,
        retornaEm: null,
        emailTeams: normalizarEmail(email).split("@")[0],
      });
      registrarAcao(quemEstaAgindo(req), "atendente:adicionar", `${nome} (#${codigoAtendente}) - fim da fila`);
    }

    // Sem convite/senha: o login e pela Senior (ver dashboard/senior.ts). Criar
    // a conta e so registra-la na allowlist com o usuario SeniorX certo; a
    // pessoa ja entra com a senha da propria conta Senior.
    const usuario = criarUsuario({ nome, email, papel, codigoAtendente });
    registrarAcao(quemEstaAgindo(req), "usuario:criar", `${nome} <${email}> - ${papel}`);
    res.json({ usuario: paraPublico(usuario) });
  } catch (err) {
    res.status(400).json({ erro: err instanceof Error ? err.message : String(err) });
  }
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

  // Conta master nao pode ser rebaixada nem desativada por ninguem.
  if (ehMaster(alvo) && (b.papel === "comum" || b.ativo === false)) {
    res.status(400).json({ erro: "Esta conta não pode ser rebaixada ou desativada." });
    return;
  }

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
    if (Object.prototype.hasOwnProperty.call(b, "codigoAtendente")) {
      const codigo = b.codigoAtendente;
      if (codigo !== null && (typeof codigo !== "number" || !Number.isInteger(codigo) || codigo <= 0)) {
        throw new Error("Código do atendente inválido.");
      }
      if (b.garantirNoRodizio === true && codigo === null) {
        throw new Error("Selecione um atendente para incluí-lo no rodízio.");
      }

      const codigoNovo = codigo as number | null;
      const conflito = codigoNovo === null ? undefined : usuarioComCodigoAtendente(todos, codigoNovo, id);
      if (conflito) {
        throw new Error(`O atendente #${codigoNovo} já está vinculado a ${conflito.nome}.`);
      }

      let atendente = codigoNovo === null
        ? undefined
        : listarAtendentes().find((a) => a.codigoAtendente === codigoNovo);

      if (codigoNovo !== null && !atendente) {
        // Um atendente removido some de atendentes.json, mas seu codigo continua
        // preservado na conta. So esse codigo previamente vinculado pode ser
        // recriado por esta rota; a tela nao pode inventar codigos do SoftDesk.
        if (b.garantirNoRodizio !== true || alvo.codigoAtendente !== codigoNovo) {
          throw new Error("Atendente vinculado não encontrado no rodízio.");
        }
        atendente = {
          nome: alvo.nome,
          codigoAtendente: codigoNovo,
          ativo: true,
          motivoInatividade: null,
          retornaEm: null,
          emailTeams: alvo.email.split("@")[0],
        } satisfies Atendente;
        adicionarAtendente(atendente);
        registrarAcao(quemEstaAgindo(req), "atendente:adicionar", `${atendente.nome} (#${codigoNovo}) - fim da fila`);
      } else if (atendente && !atendente.ativo && b.garantirNoRodizio === true) {
        reativarManualmente(atendente.nome);
        registrarAcao(quemEstaAgindo(req), "atendente:reativar", atendente.nome);
      }

      if (codigoNovo !== alvo.codigoAtendente) {
        mudarCodigoAtendente(id, codigoNovo);
        const anterior = alvo.codigoAtendente === null ? "sem vínculo" : `#${alvo.codigoAtendente}`;
        const atual = codigoNovo === null ? "sem vínculo" : `${atendente?.nome ?? "Atendente"} (#${codigoNovo})`;
        registrarAcao(quemEstaAgindo(req), "usuario:mudar-atendente", `${alvo.email}: ${anterior} -> ${atual}`);
      }
    }

    const emailNovo = texto(b.email);
    if (emailNovo && emailNovo.toLowerCase() !== alvo.email) {
      mudarEmail(id, emailNovo);
      registrarAcao(quemEstaAgindo(req), "usuario:mudar-email", `${alvo.email} -> ${emailNovo.toLowerCase()}`);
    }
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
