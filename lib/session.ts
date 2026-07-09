import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export const SESSION_COOKIE_NAME = "syl_session";
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * Lê o ID de sessão anônima do cookie, se existir.
 * Uso: Server Components (ex: dashboard) — leitura apenas.
 */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Lê o ID de sessão anônima existente, ou cria um novo se não houver.
 * Uso: Route Handlers e Server Actions — onde é permitido escrever cookies.
 */
export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (existing) {
    return existing;
  }

  const sessionId = randomUUID();

  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_IN_SECONDS,
  });

  return sessionId;
}