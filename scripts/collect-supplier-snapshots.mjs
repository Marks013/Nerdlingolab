import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import process from "node:process";
import { chromium } from "@playwright/test";

const repositoryCsvPath = path.resolve("data/shopify/products_export_1.csv");
const defaultOutputPath = path.resolve("data/dropshipping", `supplier-snapshots-${new Date().toISOString().slice(0, 10)}.csv`);
const args = parseArgs(process.argv.slice(2));
const inputPath = path.resolve(args.input ?? repositoryCsvPath);
const outputPath = path.resolve(args.output ?? defaultOutputPath);
const userDataDir = path.resolve(args.profile ?? ".tmp/supplier-collector-profile");
const limit = args.limit ? Number.parseInt(args.limit, 10) : undefined;
const delayMs = args.delay ? Number.parseInt(args.delay, 10) : 900;

if (!fs.existsSync(inputPath)) {
  throw new Error(`Arquivo de entrada nao encontrado: ${inputPath}`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(userDataDir, { recursive: true });

const urls = readInputUrls(fs.readFileSync(inputPath, "utf8"));
const selectedUrls = Number.isFinite(limit) ? urls.slice(0, limit) : urls;
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: !args.headed,
  viewport: { height: 900, width: 1366 }
});
const page = context.pages()[0] ?? await context.newPage();
const rows = [["url", "provider", "title", "price", "stock", "status", "note", "checkedAt"]];

try {
  if (args.loginFirst) {
    await runInteractiveLogin(context, page);
  }

  for (const [index, url] of selectedUrls.entries()) {
    process.stdout.write(`[${index + 1}/${selectedUrls.length}] ${url}\n`);
    const snapshot = await collectUrlSnapshot(page, url, delayMs);

    rows.push([
      url,
      snapshot.provider,
      snapshot.title,
      snapshot.price,
      snapshot.stock,
      snapshot.status,
      snapshot.note,
      new Date().toISOString()
    ]);
    fs.writeFileSync(outputPath, toCsv(rows), "utf8");
  }
} finally {
  await context.close();
}

console.log(JSON.stringify({
  input: inputPath,
  output: outputPath,
  profile: userDataDir,
  processed: selectedUrls.length
}, null, 2));

function parseArgs(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const value = rawArgs[index];

    if (value === "--headed") {
      parsed.headed = true;
    } else if (value === "--login-first") {
      parsed.loginFirst = true;
    } else if (value === "--input") {
      parsed.input = rawArgs[index + 1];
      index += 1;
    } else if (value === "--output") {
      parsed.output = rawArgs[index + 1];
      index += 1;
    } else if (value === "--profile") {
      parsed.profile = rawArgs[index + 1];
      index += 1;
    } else if (value === "--limit") {
      parsed.limit = rawArgs[index + 1];
      index += 1;
    } else if (value === "--delay") {
      parsed.delay = rawArgs[index + 1];
      index += 1;
    }
  }

  return parsed;
}

async function runInteractiveLogin(context, page) {
  if (!args.headed) {
    console.log("Aviso: --login-first funciona melhor junto com --headed.");
  }

  const loginPages = [
    ["Mercado Livre", "https://www.mercadolivre.com.br/"],
    ["Shopee", "https://shopee.com.br/"]
  ];

  console.log("\nModo login assistido iniciado.");
  console.log(`Perfil persistente: ${userDataDir}`);
  console.log("1. Faca login nas abas abertas.");
  console.log("2. Resolva verificacoes/captcha se aparecer.");
  console.log("3. Volte para este terminal e pressione Enter para iniciar a coleta.\n");

  await page.goto(loginPages[0][1], { timeout: 45_000, waitUntil: "domcontentloaded" });

  for (const [name, url] of loginPages.slice(1)) {
    const loginPage = await context.newPage();

    await loginPage.goto(url, { timeout: 45_000, waitUntil: "domcontentloaded" });
    console.log(`Aba aberta: ${name}`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    await rl.question("Depois de logar nas contas, pressione Enter para continuar...");
  } finally {
    rl.close();
  }
}

async function collectUrlSnapshot(page, url, delayMs) {
  try {
    await page.goto(url, { timeout: 45_000, waitUntil: "domcontentloaded" });
    await page.waitForTimeout(delayMs);

    return await page.evaluate(() => {
      const pageUrl = location.href;
      const text = document.body?.innerText ?? "";
      const provider = /shopee\./i.test(pageUrl)
        ? "SHOPEE"
        : /mercadolivre|mercadolibre/i.test(pageUrl)
          ? "MERCADO_LIVRE"
          : "";
      const title = findTitle();
      const structured = findStructuredProduct();
      const price = structured.price || findMeta(["product:price:amount", "price", "twitter:data1"]) || findVisiblePrice(text);
      const stock = findStock(text, structured.availability);
      const status = findStatus(text, structured.availability, price);
      const note = status === "CONFIG_REQUIRED"
        ? "Pagina abriu sem preco/estoque estruturado ou exibiu verificacao."
        : "Coleta assistida por navegador.";

      return {
        note,
        price: price || "",
        provider,
        status,
        stock: stock ?? "",
        title: title || structured.title || ""
      };

      function findTitle() {
        return findMeta(["og:title", "twitter:title"])
          || document.querySelector("h1")?.textContent?.trim()
          || document.title?.trim()
          || "";
      }

      function findStructuredProduct() {
        const output = { availability: "", price: "", title: "" };
        const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];

        for (const script of scripts) {
          try {
            const parsed = JSON.parse(script.textContent || "null");
            const product = findProductNode(parsed);
            const offer = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;

            if (product?.name) {
              output.title = String(product.name);
            }

            if (offer?.price || offer?.lowPrice) {
              output.price = String(offer.price || offer.lowPrice);
            }

            if (offer?.availability) {
              output.availability = String(offer.availability);
            }

            if (output.price || output.availability) {
              return output;
            }
          } catch {
            continue;
          }
        }

        return output;
      }

      function findProductNode(value) {
        if (!value || typeof value !== "object") {
          return null;
        }

        if (Array.isArray(value)) {
          return value.map(findProductNode).find(Boolean) || null;
        }

        const type = Array.isArray(value["@type"]) ? value["@type"].join(" ") : String(value["@type"] || "");

        if (/Product/i.test(type)) {
          return value;
        }

        return findProductNode(value["@graph"]) || findProductNode(value.mainEntity) || findProductNode(value.itemListElement);
      }

      function findMeta(names) {
        for (const name of names) {
          const selector = `meta[property="${cssEscape(name)}"], meta[name="${cssEscape(name)}"]`;
          const value = document.querySelector(selector)?.getAttribute("content")?.trim();

          if (value) {
            return value;
          }
        }

        return "";
      }

      function cssEscape(value) {
        return value.replace(/"/g, "\\\"");
      }

      function findVisiblePrice(bodyText) {
        const matches = [...bodyText.matchAll(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/g)]
          .map((match) => match[0])
          .filter((value) => !/frete|envio/i.test(value));

        return matches[0] || "";
      }

      function findStock(bodyText, availability) {
        if (/OutOfStock|esgotado|sem estoque|indisponivel|indisponível/i.test(`${availability}\n${bodyText}`)) {
          return "0";
        }

        const match = bodyText.match(/([0-9]{1,4})\s+(?:dispon[ií]ve(?:l|is)|em estoque|unidades?)/i);

        return match?.[1] || "";
      }

      function findStatus(bodyText, availability, priceValue) {
        const joined = `${availability}\n${bodyText}`;

        if (/account-verification|captcha|robot|challenge|verifica[cç][aã]o/i.test(pageUrl) || /verifique que voce|verifique que voc[eê]|nao sou um robo|não sou um robô/i.test(joined)) {
          return "CONFIG_REQUIRED";
        }

        if (/OutOfStock|esgotado|sem estoque|indisponivel|indisponível/i.test(joined)) {
          return "OUT_OF_STOCK";
        }

        if (/pausad|an[uú]ncio finalizado|produto removido|publica[cç][aã]o finalizada/i.test(joined)) {
          return "PAUSED";
        }

        return priceValue ? "ACTIVE" : "CONFIG_REQUIRED";
      }
    });
  } catch (error) {
    return {
      note: error instanceof Error ? error.message : "Falha desconhecida",
      price: "",
      provider: detectProvider(url),
      status: "ERROR",
      stock: "",
      title: ""
    };
  }
}

function readInputUrls(text) {
  const rows = parseCsv(text);

  if (!rows.length) {
    return [];
  }

  if (rows[0].length === 1 && /^https?:\/\//i.test(rows[0][0])) {
    return [...new Set(rows.flat().map((value) => value.trim()).filter((value) => /^https?:\/\//i.test(value)))];
  }

  const [header, ...dataRows] = rows;
  const columns = Object.fromEntries(header.map((name, index) => [name, index]));
  const linkColumn = Object.keys(columns).find((name) => ["Link", "url", "URL", "originalUrl"].includes(name) || name.startsWith("Link ("));

  if (!linkColumn) {
    throw new Error("Nenhuma coluna de link encontrada. Use Link, url ou originalUrl.");
  }

  return [...new Set(dataRows.map((row) => normalizeUrl(row[columns[linkColumn]] ?? "")).filter(Boolean))];
}

function detectProvider(url) {
  if (/shopee\./i.test(url)) {
    return "SHOPEE";
  }

  if (/mercadolivre|mercadolibre/i.test(url)) {
    return "MERCADO_LIVRE";
  }

  return "";
}

function normalizeUrl(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  try {
    const url = new URL(rawValue.startsWith("//") ? `https:${rawValue}` : rawValue);

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function toCsv(rows) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value ?? "");

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (isQuoted) {
      if (char === "\"" && nextChar === "\"") {
        field += "\"";
        index += 1;
      } else if (char === "\"") {
        isQuoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      isQuoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((currentRow) => currentRow.some((value) => value.trim()));
}
