import dotenv from "dotenv";
import path from "node:path";

// Carrega o .env pelo caminho do projeto, nao pelo diretorio de trabalho atual -
// assim o bot e o dashboard funcionam mesmo invocados de fora da pasta do projeto.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

export const config = {
  softdeskUrl: process.env.SOFTDESK_URL ?? "https://js.soft4.com.br/chamado",
  email: process.env.SOFTDESK_EMAIL ?? "",
  password: process.env.SOFTDESK_PASSWORD ?? "",
  pollIntervalMinutes: Number(process.env.POLL_INTERVAL_MINUTES ?? 5),
  headless: process.env.HEADLESS === "true",
  dryRun: process.env.DRY_RUN === "true",
  encaminhamentoLimiteMinutos: 15,
  stateFile: path.join(__dirname, "..", "state", "rotation.json"),
  teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL ?? "",
  // Dominio dos e-mails/UPN do Teams. Os atendentes guardam so o usuario
  // (ex.: "felipe.prado") e o dominio e anexado aqui pra formar a @mention.
  teamsEmailDomain: process.env.TEAMS_EMAIL_DOMAIN ?? "",
  dashboardPort: Number(process.env.DASHBOARD_PORT ?? 3001),
  dashboardPassword: process.env.DASHBOARD_PASSWORD ?? "",
};

if (!config.email || !config.password) {
  throw new Error("Defina SOFTDESK_EMAIL e SOFTDESK_PASSWORD no arquivo .env");
}
