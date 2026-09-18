import { test, expect } from "@playwright/test";

/**
 * Fluxo de ponta a ponta: cria um link na landing page, visita o link
 * curto e confirma o redirect, depois confere no dashboard que o click
 * foi contado. Roda contra um `next dev` real (ver playwright.config.ts),
 * batendo no banco de teste (.env.test) — não usa mocks de rede nem de
 * API, de propósito: é justamente a integração real entre browser,
 * servidor e banco que os testes de integração do Jest não cobrem.
 */
test("cria um link, é redirecionado, e o click aparece no dashboard", async ({ page }) => {
  const longUrl = "https://example.com/";

  await page.goto("/");
  // Espera a hidratação terminar: um clique cedo demais no botão cai no
  // submit nativo do <form> (sem handler JS ainda anexado) em vez do
  // fetch para /api/links, recarregando a página com o input vazio.
  await page.waitForLoadState("networkidle");

  await page.locator("#url").fill(longUrl);
  await page.getByRole("button", { name: "Encurtar" }).click();

  const resultLink = page.getByTestId("short-link-result");
  await expect(resultLink).toBeVisible();

  const shortHref = await resultLink.getAttribute("href");
  expect(shortHref).toBeTruthy();

  const slug = new URL(shortHref!).pathname.slice(1);
  expect(slug).toHaveLength(6);

  // Visita o link curto numa navegação de página inteira (não um clique
  // em target="_blank", que abriria uma aba nova) e confirma o redirect.
  await page.goto(shortHref!);
  await expect(page).toHaveURL(longUrl);

  await page.goto("/dashboard");

  const row = page.locator("li").filter({ has: page.locator(`a[href="/${slug}"]`) });
  await expect(row).toBeVisible();
  await expect(row.getByTestId("click-count")).toHaveText("1");
});
