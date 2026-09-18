import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// CSP calibrada para o que a aplicação de fato usa:
// - next/font/google faz self-hosting das fontes no build (sem domínio externo),
//   então font-src/style-src não precisam abrir para fonts.googleapis.com.
// - Não há <script> inline, dangerouslySetInnerHTML nem next/script no projeto.
// - 'unsafe-inline' em style-src só é liberado em dev: o Fast Refresh do
//   Next injeta <style> inline para hot-reload de CSS; o build de produção
//   serve o CSS do Tailwind como arquivo externo, então lá a diretiva fica estrita.
// - 'unsafe-eval' em script-src só em dev, pelo mesmo motivo documentado no
//   próprio guia de CSP do Next: o React usa eval em dev para stack traces melhores.
const cspHeader = `
  default-src 'self';
  script-src 'self'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self'${isDev ? " 'unsafe-inline'" : ""};
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  devIndicators: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
