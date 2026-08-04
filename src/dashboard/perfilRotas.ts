import express from "express";
import { definirSenha, verificarSenha } from "../usuarios/usuarios";
import { validarSenha } from "../usuarios/senhaPolitica";

/**
 * "Meu perfil" - trocar a propria senha. Montada em /api/perfil, atras do
 * exigirLogin global. Nao precisa de exigirPermissao: "senha:trocar-propria"
 * ja e liberado a todos (ver src/usuarios/permissoes.ts), a unica regra de
 * negocio aqui e' que a sessao legada (senha compartilhada) nao tem Usuario
 * nenhum pra trocar a senha de.
 */

export const perfilRouter = express.Router();

perfilRouter.post("/senha", (req, res) => {
  const sessao = req.sessao!;
  if (sessao.tipo === "legado") {
    res.status(400).json({ erro: "A sessão da senha compartilhada não tem senha própria para trocar." });
    return;
  }

  const senhaAtual = typeof req.body?.senhaAtual === "string" ? req.body.senhaAtual : "";
  const novaSenha = typeof req.body?.novaSenha === "string" ? req.body.novaSenha : "";

  if (!verificarSenha(sessao.usuario, senhaAtual)) {
    res.status(401).json({ erro: "Senha atual incorreta." });
    return;
  }

  const motivos = validarSenha(novaSenha);
  if (motivos.length > 0) {
    res.status(400).json({ erro: motivos.join(" ") });
    return;
  }

  definirSenha(sessao.usuario.id, novaSenha);
  res.json({ ok: true });
});
