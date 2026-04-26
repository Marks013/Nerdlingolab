import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { chromium, devices } from "@playwright/test";

loadDotEnvFile(".env");

const baseUrl = process.env.UI_AUDIT_BASE_URL ?? process.env.APP_URL ?? "http://localhost:3000";
const adminEmail = process.env.UI_AUDIT_ADMIN_EMAIL ?? process.env.SUPERADMIN_EMAIL ?? "admin@nerdlingolab.local";
const adminPassword = process.env.UI_AUDIT_ADMIN_PASSWORD ?? process.env.SUPERADMIN_PASSWORD ?? "Temporary-admin-password-123!";
const screenshotDirectory = join(process.cwd(), "test-results", "ui-runtime-audit");

const publicPaths = ["/", "/produtos", "/programa-de-fidelidade", "/carrinho", "/checkout", "/conta", "/admin/login"];
const adminPaths = [
  "/admin/dashboard",
  "/admin/produtos",
  "/admin/categorias",
  "/admin/cupons",
  "/admin/fidelidade",
  "/admin/pedidos",
  "/admin/relatorios",
  "/admin/newsletter",
  "/admin/suporte",
  "/admin/tema"
];

const projects = [
  { name: "desktop", use: devices["Desktop Chrome"] },
  { name: "mobile", use: devices["Pixel 7"] }
];

function loadDotEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const source = readFileSync(filePath, "utf8");

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);

    if (!match || process.env[match[1]]) {
      continue;
    }

    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function pageUrl(path) {
  return new URL(path, baseUrl).toString();
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

async function loginAsAdmin(page) {
  await page.goto(pageUrl("/admin/login"), { waitUntil: "networkidle" });
  await page.getByLabel("E-mail").fill(adminEmail);
  await page.getByLabel("Senha").fill(adminPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/admin/dashboard", { timeout: 15_000 });
}

async function auditPage(page, path, projectName) {
  const findings = [];
  const consoleMessages = [];
  const requestFailures = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (["error"].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    const url = request.url();

    if (failure?.errorText === "net::ERR_ABORTED") {
      return;
    }

    requestFailures.push(`${request.method()} ${request.url()} ${failure?.errorText ?? "falhou"}`);
  });

  const response = await page.goto(pageUrl(path), { waitUntil: "networkidle" });
  const status = response?.status() ?? 0;

  if (status >= 500) {
    findings.push(`HTTP ${status} em ${path}`);
  }

  const runtimeFindings = await page.evaluate(() => {
    const forbiddenVisibleTexts = [
      /Unhandled Runtime Error/i,
      /Hydration failed/i,
      /Fast Refresh/i,
      /stack trace/i,
      /\bTODO\b/,
      /\bFIXME\b/,
      /lorem ipsum/i,
      /\bNaN\b/,
      /\bundefined\b/i
    ];
    const bodyText = document.body.innerText || "";
    const visibleTextFindings = forbiddenVisibleTexts
      .filter((pattern) => pattern.test(bodyText))
      .map((pattern) => `Texto indevido visível: ${pattern.toString()}`);

    const horizontalOverflow = [];
    const viewportWidth = document.documentElement.clientWidth;

    if (document.documentElement.scrollWidth > viewportWidth + 2) {
      horizontalOverflow.push(
        `Página com overflow horizontal: ${document.documentElement.scrollWidth}px > ${viewportWidth}px`
      );
    }

    for (const element of Array.from(document.querySelectorAll("body *"))) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      if (style.display === "none" || style.visibility === "hidden" || rect.width === 0 || rect.height === 0) {
        continue;
      }

      const scrollParent = element.closest(".overflow-x-auto, .overflow-x-scroll, [data-ui-audit-scrollable]");

      if (!scrollParent && rect.right > viewportWidth + 2 && horizontalOverflow.length < 8) {
        const label = element.textContent?.trim().slice(0, 80) || element.getAttribute("aria-label") || element.tagName;
        horizontalOverflow.push(`Elemento ultrapassa viewport: ${element.tagName.toLowerCase()} "${label}"`);
      }
    }

    const brokenImages = Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => `Imagem quebrada: ${image.currentSrc || image.src}`);

    const imagesWithoutAlt = Array.from(document.images)
      .filter((image) => !image.hasAttribute("alt"))
      .map((image) => `Imagem sem alt: ${image.currentSrc || image.src}`);

    const unnamedControls = Array.from(
      document.querySelectorAll("button, a[href], input, select, textarea")
    )
      .filter((element) => {
        if (element instanceof HTMLInputElement && element.type === "hidden") {
          return false;
        }

        const ariaLabel = element.getAttribute("aria-label");
        const ariaLabelledBy = element.getAttribute("aria-labelledby");
        const title = element.getAttribute("title");
        const text = element.textContent?.trim();
        const imageAlt = Array.from(element.querySelectorAll("img"))
          .map((image) => image.getAttribute("alt")?.trim())
          .filter(Boolean)
          .join(" ");
        const inputValue = element instanceof HTMLInputElement ? element.value || element.placeholder : "";
        const id = element.getAttribute("id");
        const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim() : "";
        const wrappingLabel = element.closest("label")?.textContent?.trim();

        return !ariaLabel && !ariaLabelledBy && !title && !text && !imageAlt && !inputValue && !label && !wrappingLabel;
      })
      .map((element) => `Controle sem nome acessível: ${element.tagName.toLowerCase()}`);

    const clippedButtons = Array.from(document.querySelectorAll("button, a[href]"))
      .filter((element) => {
        if (element.classList.contains("sr-only") && document.activeElement !== element) {
          return false;
        }

        return element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2;
      })
      .map((element) => `Texto possivelmente cortado: ${element.tagName.toLowerCase()} "${element.textContent?.trim() ?? ""}"`);

    return [
      ...visibleTextFindings,
      ...horizontalOverflow,
      ...brokenImages,
      ...imagesWithoutAlt,
      ...unnamedControls,
      ...clippedButtons
    ];
  });

  findings.push(...runtimeFindings);
  findings.push(...consoleMessages.map((message) => `Console ${message}`));
  findings.push(...pageErrors.map((message) => `Erro JS: ${message}`));
  findings.push(...requestFailures.map((message) => `Requisição falhou: ${message}`));

  await page.screenshot({
    fullPage: true,
    path: join(screenshotDirectory, `${projectName}-${path.replace(/[^\w]+/g, "-") || "home"}.png`)
  });

  return findings.map((finding) => `${projectName} ${path}: ${normalizeText(finding)}`);
}

async function run() {
  await mkdir(screenshotDirectory, { recursive: true });
  const allFindings = [];

  for (const project of projects) {
    const browser = await chromium.launch();
    const context = await browser.newContext(project.use);
    const page = await context.newPage();

    for (const path of publicPaths) {
      allFindings.push(...(await auditPage(page, path, project.name)));
    }

    await loginAsAdmin(page);

    for (const path of adminPaths) {
      allFindings.push(...(await auditPage(page, path, project.name)));
    }

    await browser.close();
  }

  if (allFindings.length > 0) {
    console.error(`Auditoria runtime de UI encontrou ${allFindings.length} problema(s):`);
    console.error(allFindings.join("\n"));
    process.exit(1);
  }

  console.log(`Auditoria runtime de UI passou para ${projects.length} viewports em ${baseUrl}.`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
