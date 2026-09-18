import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],
  // e2e/ usa @playwright/test (seu próprio test runner, com watch mode e
  // sobe um servidor real) — sem isso, Jest tenta rodar os specs também e
  // quebra, já que `test()`/`expect()` do Playwright não são os do Jest.
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/e2e/"],
  // Cobertura só na camada testada por este runner: lib/ (lógica) e as
  // route handlers (app/**/route.ts). Componentes React e páginas
  // (page.tsx, layout.tsx) não têm nenhum teste de componente aqui — o
  // fluxo deles é coberto pelo E2E (e2e/), não pelo Jest, então incluí-los
  // só derrubaria o número sem refletir uma lacuna real de teste "faltando
  // escrever". lib/prisma.ts fica de fora por ser só wiring trivial do
  // singleton, sem lógica própria que valha a pena gatear.
  collectCoverageFrom: ["lib/**/*.ts", "app/**/route.ts", "!lib/prisma.ts"],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 75,
      lines: 80,
    },
  },
};

export default createJestConfig(config);