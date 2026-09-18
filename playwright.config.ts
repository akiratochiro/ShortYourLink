import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import path from "path";

// Reaproveita o mesmo banco de teste isolado que a suíte de integração do
// Jest já usa (.env.test, documentado no README) — em vez de introduzir um
// terceiro banco só para o E2E. Ver playwright.config.ts webServer.env
// abaixo para o porquê disso importa mais do que parece.
loadEnv({ path: path.resolve(__dirname, ".env.test") });

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    timeout: 120_000,
    // SEMPRE sobe um `next dev` novo pro E2E, nunca reaproveita um que já
    // esteja rodando na porta. Um dev server "ambiente" pode estar de pé
    // com outro DATABASE_URL — inclusive o de produção, se alguém rodar
    // `npm run dev` sem overridar a env var (é exatamente o `.env` deste
    // projeto hoje). Reaproveitar silenciosamente rodaria os testes contra
    // o banco errado; `reuseExistingServer: false` elimina esse risco à
    // custa de alguns segundos de cold start a cada execução.
    reuseExistingServer: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      NODE_ENV: "development",
    },
  },
});
