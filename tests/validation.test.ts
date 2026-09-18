import { createLinkSchema } from "@/lib/validation";

describe("createLinkSchema", () => {
  it("aceita uma URL http válida", () => {
    const result = createLinkSchema.safeParse({ url: "http://exemplo.com" });
    expect(result.success).toBe(true);
  });

  it("aceita uma URL https válida, removendo espaços extras", () => {
    const result = createLinkSchema.safeParse({ url: "  https://exemplo.com/pagina  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe("https://exemplo.com/pagina");
    }
  });

  it("rejeita URL vazia", () => {
    const result = createLinkSchema.safeParse({ url: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita string que não é uma URL", () => {
    const result = createLinkSchema.safeParse({ url: "isso não é uma url" });
    expect(result.success).toBe(false);
  });

  it("rejeita protocolos que não sejam http/https", () => {
    const result = createLinkSchema.safeParse({ url: "javascript:alert(1)" });
    expect(result.success).toBe(false);
  });

  it("rejeita quando o campo url não é enviado", () => {
    const result = createLinkSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejeita localhost e endereços de loopback", () => {
    expect(createLinkSchema.safeParse({ url: "http://localhost:3000" }).success).toBe(false);
    expect(createLinkSchema.safeParse({ url: "http://127.0.0.1/admin" }).success).toBe(false);
  });

  it("rejeita IPs privados e o endereço de metadata de nuvem", () => {
    expect(createLinkSchema.safeParse({ url: "http://192.168.1.1" }).success).toBe(false);
    expect(createLinkSchema.safeParse({ url: "http://169.254.169.254/latest/meta-data/" }).success).toBe(false);
  });
});