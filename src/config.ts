import dotenv from "dotenv";
import path from "node:path";

// Carrega o .env pelo caminho do projeto, nao pelo diretorio de trabalho atual -
// assim o bot e o dashboard funcionam mesmo invocados de fora da pasta do projeto.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const softdeskUrl = process.env.SOFTDESK_URL ?? "https://js.soft4.com.br/chamado";

/**
 * Esquema + host da `softdeskUrl`, que aponta pro modulo de chamados
 * (".../chamado"). O cliente HTTP e os headers de referer precisam so do host.
 *
 * Derivar daqui e o que faz SOFTDESK_URL valer pro bot inteiro: antes, o
 * sessao.ts tinha o host cravado e o assign.ts repetia a URL absoluta em tres
 * headers, entao trocar a variavel mudava so os links do card do Teams - a
 * automacao continuava batendo no ambiente de producao de qualquer jeito.
 */
function origemDe(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    throw new Error(`SOFTDESK_URL invalida: "${url}". Use a URL completa, ex.: https://js.soft4.com.br/chamado`);
  }
}

export const config = {
  softdeskUrl,
  softdeskOrigem: origemDe(softdeskUrl),
  email: process.env.SOFTDESK_EMAIL ?? "",
  password: process.env.SOFTDESK_PASSWORD ?? "",
  pollIntervalMinutes: Number(process.env.POLL_INTERVAL_MINUTES ?? 5),
  dryRun: process.env.DRY_RUN === "true",
  encaminhamentoLimiteMinutos: 15,
  stateFile: path.join(__dirname, "..", "state", "rotation.json"),
  teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL ?? "",
  // Webhook de um canal separado, usado pra validar a aparencia de um card novo
  // sem poluir o canal real. Consumido so pelo `npm run relatorio -- --teste`.
  teamsWebhookTesteUrl: process.env.TEAMS_WEBHOOK_TESTE_URL ?? "",
  // Dominio dos e-mails/UPN do Teams. Os atendentes guardam so o usuario
  // (ex.: "felipe.prado") e o dominio e anexado aqui pra formar a @mention.
  teamsEmailDomain: process.env.TEAMS_EMAIL_DOMAIN ?? "",
  dashboardPort: Number(process.env.DASHBOARD_PORT ?? 3001),
  dashboardPassword: process.env.DASHBOARD_PASSWORD ?? "",
  // Chave do cofre de senhas de clientes (AES-256-GCM, 32 bytes em base64).
  // Opcional aqui de proposito: sem ela, so o cofre fica indisponivel - o
  // resto do bot continua funcionando. Gerar com `npm run cofre:gerar-chave`.
  cofreChave: process.env.COFRE_CHAVE ?? "",
};

if (!config.email || !config.password) {
  throw new Error("Defina SOFTDESK_EMAIL e SOFTDESK_PASSWORD no arquivo .env");
}
