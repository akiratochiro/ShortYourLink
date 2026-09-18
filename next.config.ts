import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// CSP calibrada para o que a aplicação de fato usa:
// - next/font/google faz self-hosting das fontes no build (sem domínio externo),
//   então font-src/style-src não precisam abrir para fonts.googleapis.com.
// - Não há dangerouslySetInnerHTML nem next/script no projeto — mas o App
//   Router do Next injeta <script> inline pra hidratação (o payload RSC de
//   cada página), tanto em dev quanto em build de produção. Descoberto via
//   o teste E2E (e2e/create-visit-and-track.spec.ts): sem 'unsafe-inline'
//   em script-src, o Chrome bloqueia esses scripts e a hidratação nunca
//   completa — o app carrega, mas nenhum clique/formulário funciona, sem
//   nenhum erro visível fora do console do navegador. `curl` (usado pra
//   validar a CSP na rodada anterior) não pega isso porque não executa JS
//   nem aplica CSP; só um browser real revela o problema.
//   A alternativa "correta" é CSP baseada em nonce via um `proxy.ts`
//   (documentado no guia de CSP do Next), que evita 'unsafe-inline' — mas
//   exige renderização dinâmica em toda página que usa o nonce (a landing
//   page hoje é estática) e um novo arquivo de infraestrutura só pra isso.
//   Desproporcional para o tráfego deste projeto; 'unsafe-inline' em
//   script-src é uma concessão explícita, com o resto da política (sem
//   object-src, sem frame-ancestors, form-action restrito) intacto.
// - 'unsafe-inline' em style-src só é liberado em dev: o Fast Refresh do
//   Next injeta <style> inline para hot-reload de CSS; o build de produção
//   serve o CSS do Tailwind como arquivo externo, então lá a diretiva fica estrita.
// - 'unsafe-eval' em script-src só em dev, pelo mesmo motivo documentado no
//   próprio guia de CSP do Next: o React usa eval em dev para stack traces melhores.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
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
