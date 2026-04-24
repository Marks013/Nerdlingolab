import { expect, test } from "@playwright/test";

test("carrega a vitrine principal", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /NerdLingoLab/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ver produtos/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Ver Nerdcoins/i })).toBeVisible();
  await expect(page.getByAltText("NerdLingoLab").first()).toBeVisible();
  await expect(page.getByText("Loja geek")).toBeVisible();
  await expect(page.getByText("Carrinho inteligente")).toBeVisible();
});

test("mantém páginas públicas essenciais acessíveis e em PT-BR", async ({ page }) => {
  const publicPages = [
    { path: "/produtos", heading: "Produtos" },
    { path: "/carrinho", heading: "Carrinho" },
    { path: "/checkout", heading: "Checkout" },
    { path: "/programa-de-fidelidade", heading: "Programa de Fidelidade" }
  ];

  for (const publicPage of publicPages) {
    await page.goto(publicPage.path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, name: publicPage.heading })).toBeVisible();
  }
});

test("cobre seções visuais de produtos e fidelidade", async ({ page }) => {
  await page.goto("/produtos");
  await expect(page.getByText(/seleções especiais da NerdLingoLab/i)).toBeVisible();
  await expect(page.getByLabel("Benefícios NerdLingoLab")).toContainText("Entrega acompanhada");
  await expect(page.getByLabel("Benefícios NerdLingoLab")).toContainText("Nerdcoins");

  await page.goto("/programa-de-fidelidade");
  await expect(page.getByText(/Acumule Nerdcoins/i)).toBeVisible();
  await expect(page.getByText("Ganhe pontos")).toBeVisible();
  await expect(page.getByText("Resgate no checkout")).toBeVisible();
  await expect(page.getByText("Histórico claro")).toBeVisible();
});

test("redireciona área restrita para entrada", async ({ page }) => {
  await page.goto("/admin/dashboard");

  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: /Entrar no admin/i })).toBeVisible();
});

test("responde verificação de saúde", async ({ request }) => {
  const response = await request.get("/api/health");
  const payload = (await response.json()) as { ok?: boolean; service?: string };

  expect(response.ok()).toBe(true);
  expect(payload.ok).toBe(true);
  expect(payload.service).toBe("nerdlingolab-commerce");
});
