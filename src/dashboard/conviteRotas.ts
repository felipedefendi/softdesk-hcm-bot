import express from "express";
import rateLimit from "express-rate-limit";
import { buscarConvitePorToken, marcarUsado } from "../usuarios/convites";
import { buscarPorId, definirSenha } from "../usuarios/usuarios";
import { validarSenha } from "../usuarios/senhaPolitica";

/**
 * Rotas do link de convite - PUBLICAS de proposito, montadas antes do
 * exigirLogin global no server.ts. Quem chega aqui ainda nao tem sessao
 * nenhuma; e exatamente o convite que da a ela a primeira senha.
 *
 * O token e 256 bits de aleatoriedade (ver convites.ts), entao forca bruta e
 * inviavel mesmo sem limite de tentativas - o limitador aqui e defesa em
 * profundidade, no mesmo espirito do resto do painel.
 */

export const conviteRouter = express.Router();

const limitador = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Aguarde um minuto." },
});

conviteRouter.use(limitador);

conviteRouter.get("/:token", (req, res) => {
  const convite = buscarConvitePorToken(req.params.token as string);
  if (!convite) {
    res.status(404).json({ erro: "Link inválido ou expirado. Peça um novo ao administrador." });
    return;
  }

  const usuario = buscarPorId(convite.usuarioId);
  if (!usuario) {
    res.status(404).json({ erro: "Link inválido ou expirado. Peça um novo ao administrador." });
    return;
  }

  res.json({ nome: usuario.nome, email: usuario.email });
});

conviteRouter.post("/:token", (req, res) => {
  const convite = buscarConvitePorToken(req.params.token as string);
  if (!convite) {
    res.status(404).json({ erro: "Link inválido ou expirado. Peça um novo ao administrador." });
    return;
  }

  const senha = typeof req.body?.senha === "string" ? req.body.senha : "";
  const motivos = validarSenha(senha);
  if (motivos.length > 0) {
    res.status(400).json({ erro: motivos.join(" ") });
    return;
  }

  definirSenha(convite.usuarioId, senha);
  marcarUsado(convite.id);
  res.json({ ok: true });
});
