import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Neon pode estar em cold start (scale-to-zero); sem teto, o monitor externo
// ficaria pendurado em vez de receber um 503 claro.
const DB_TIMEOUT_MS = 5000;

export async function GET() {
  const headers = { "Cache-Control": "no-store" };

  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), DB_TIMEOUT_MS);
      }),
    ]);
    return NextResponse.json({ status: "ok", database: "ok" }, { headers });
  } catch (err) {
    console.error("[health] database check failed:", err);
    // Detalhe genérico de propósito: endpoint público, não vaza a mensagem
    // do driver (host, usuário) — o erro real fica só no log do servidor.
    return NextResponse.json(
      { status: "error", database: "unreachable" },
      { status: 503, headers },
    );
  } finally {
    clearTimeout(timer);
  }
}
