import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/client-ip";

function requestWithHeaders(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/test", { headers });
}

describe("getClientIp", () => {
  it("usa o primeiro IP de x-forwarded-for quando presente", () => {
    const request = requestWithHeaders({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });
    expect(getClientIp(request)).toBe("203.0.113.5");
  });

  it("cai para x-real-ip quando x-forwarded-for está ausente", () => {
    const request = requestWithHeaders({ "x-real-ip": "198.51.100.7" });
    expect(getClientIp(request)).toBe("198.51.100.7");
  });

  it("devolve 'unknown' quando nenhum header de proxy está presente", () => {
    const request = requestWithHeaders({});
    expect(getClientIp(request)).toBe("unknown");
  });

  it("remove espaços ao redor do IP extraído", () => {
    const request = requestWithHeaders({ "x-forwarded-for": "  203.0.113.9  , 10.0.0.1" });
    expect(getClientIp(request)).toBe("203.0.113.9");
  });
});
