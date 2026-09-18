import { isPrivateOrLoopbackHost } from "@/lib/url-safety";

describe("isPrivateOrLoopbackHost", () => {
  it("bloqueia localhost e variações", () => {
    expect(isPrivateOrLoopbackHost("localhost")).toBe(true);
    expect(isPrivateOrLoopbackHost("LOCALHOST")).toBe(true);
    expect(isPrivateOrLoopbackHost("localhost.localdomain")).toBe(true);
  });

  it("bloqueia loopback IPv4 e IPv6", () => {
    expect(isPrivateOrLoopbackHost("127.0.0.1")).toBe(true);
    expect(isPrivateOrLoopbackHost("127.5.5.5")).toBe(true);
    expect(isPrivateOrLoopbackHost("::1")).toBe(true);
  });

  it("bloqueia ranges privados (RFC 1918)", () => {
    expect(isPrivateOrLoopbackHost("10.0.0.5")).toBe(true);
    expect(isPrivateOrLoopbackHost("172.16.0.1")).toBe(true);
    expect(isPrivateOrLoopbackHost("172.31.255.255")).toBe(true);
    expect(isPrivateOrLoopbackHost("192.168.1.1")).toBe(true);
  });

  it("bloqueia link-local, incluindo o IP de metadata de nuvem", () => {
    expect(isPrivateOrLoopbackHost("169.254.169.254")).toBe(true);
    expect(isPrivateOrLoopbackHost("fe80::1")).toBe(true);
  });

  it("bloqueia hostnames .local e .internal", () => {
    expect(isPrivateOrLoopbackHost("printer.local")).toBe(true);
    expect(isPrivateOrLoopbackHost("service.internal")).toBe(true);
  });

  it("permite hosts públicos comuns", () => {
    expect(isPrivateOrLoopbackHost("example.com")).toBe(false);
    expect(isPrivateOrLoopbackHost("8.8.8.8")).toBe(false);
    expect(isPrivateOrLoopbackHost("sub.example.com")).toBe(false);
  });

  it("não confunde 172.15.x e 172.32.x (fora do range 172.16/12) com privado", () => {
    expect(isPrivateOrLoopbackHost("172.15.0.1")).toBe(false);
    expect(isPrivateOrLoopbackHost("172.32.0.1")).toBe(false);
  });
});
