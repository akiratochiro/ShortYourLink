import { parseHostfileToDomains, isKnownMaliciousDomain } from "@/lib/malicious-domains";

describe("parseHostfileToDomains", () => {
  it("extrai domínios de um hostfile no formato do URLhaus", () => {
    const hostfile = [
      "# abuse.ch URLhaus Host file",
      "# Last updated: 2026-01-01",
      "127.0.0.1 malicious-example.test",
      "127.0.0.1 outro-dominio-ruim.test",
      "",
    ].join("\n");

    const domains = parseHostfileToDomains(hostfile);

    expect(domains.has("malicious-example.test")).toBe(true);
    expect(domains.has("outro-dominio-ruim.test")).toBe(true);
    expect(domains.size).toBe(2);
  });

  it("ignora linhas vazias e comentários", () => {
    const domains = parseHostfileToDomains("# comentário\n\n   \n");
    expect(domains.size).toBe(0);
  });
});

describe("isKnownMaliciousDomain", () => {
  it("não bate na rede em ambiente de teste e não bloqueia por padrão", async () => {
    // NODE_ENV=test (definido pelo Jest) faz a blocklist nunca ser buscada,
    // então, sem cache pré-populado, nenhum domínio é considerado malicioso.
    expect(await isKnownMaliciousDomain("example.com")).toBe(false);
  });
});
