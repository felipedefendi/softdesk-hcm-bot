/**
 * Execucao unica: cria as contas dos membros da equipe com a senha padrao.
 * Rodar com: npx ts-node scripts/seed-usuarios.ts
 * Seguro reexecutar - pula quem ja existe.
 */

import { criarUsuario, buscarPorEmail, definirSenha } from "../src/usuarios/usuarios";

const SENHA = "@SuporteJs3441";

const EQUIPE = [
  { nome: "Mateus Ricardo", email: "mateus.ricardo@seniornortepr.com.br", papel: "admin" as const, codigoAtendente: 9 },
  { nome: "Felipe Prado",   email: "felipe.prado@seniornortepr.com.br",   papel: "admin" as const, codigoAtendente: 76 },
  { nome: "Nauber Shimizu", email: "nauber@seniornortepr.com.br",          papel: "admin" as const, codigoAtendente: null },
  { nome: "Dioni Magalhaes",  email: "dioni.magalhaes@seniornortepr.com.br",  papel: "comum" as const, codigoAtendente: 66 },
  { nome: "Gabriel Oliveira", email: "gabriel.oliveira@seniornortepr.com.br", papel: "comum" as const, codigoAtendente: 48 },
  { nome: "Lucas Oliveira",   email: "lucas.oliveira@seniornortepr.com.br",   papel: "comum" as const, codigoAtendente: 69 },
  { nome: "Rodrigo Ribeiro",  email: "rodrigo.ribeiro@seniornortepr.com.br",  papel: "comum" as const, codigoAtendente: 64 },
  { nome: "Jonathan Carvalho", email: "jonathan.carvalho@seniornortepr.com.br", papel: "comum" as const, codigoAtendente: null },
];

for (const membro of EQUIPE) {
  const jaExiste = buscarPorEmail(membro.email);
  if (jaExiste) {
    console.log(`[pulado]  ${membro.nome} (${membro.email}) — ja existe`);
    continue;
  }

  const usuario = criarUsuario(membro);
  definirSenha(usuario.id, SENHA);
  console.log(`[criado]  ${membro.nome} (${membro.email}) — ${membro.papel}${membro.codigoAtendente ? `, atendente ${membro.codigoAtendente}` : ""}`);
}

console.log("\nstate/usuarios.json atualizado.");
