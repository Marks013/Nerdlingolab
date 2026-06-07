import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { chromium } from "@playwright/test";

const repositoryCsvPath = path.resolve("data/shopify/products_export_1.csv");
const defaultOutputPath = path.resolve("data/dropshipping", `supplier-snapshots-${new Date().toISOString().slice(0, 10)}.csv`);
const importColumns = ["preco_importacao", "estoque_importacao", "status", "titulo_importacao", "note", "checkedAt"];
const minimumReliablePrice = 15;
const maximumReliablePrice = 2000;
const args = parseArgs(process.argv.slice(2));
const inputPath = path.resolve(args.input ?? repositoryCsvPath);
const outputPath = path.resolve(args.output ?? defaultOutputPath);
const userDataDir = path.resolve(args.profile ?? ".tmp/supplier-collector-profile");
const limit = args.limit ? Number.parseInt(args.limit, 10) : undefined;
const delayMs = args.delay ? Number.parseInt(args.delay, 10) : 900;
const skipReviewOnly = Boolean(args.skipReviewOnly);

if (!fs.existsSync(inputPath)) {
  throw new Error(`Arquivo de entrada nao encontrado: ${inputPath}`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(userDataDir, { recursive: true });

const inputText = stripBom(fs.readFileSync(inputPath, "utf8"));
const input = readInputRows(inputText);
const selectedRows = Number.isFinite(limit) ? input.rows.slice(0, limit) : input.rows;
const outputHeaders = ensureColumns(input.headers, importColumns);
const context = await chromium.launchPersistentContext(userDataDir, {
  args: ["--disable-dev-shm-usage", "--no-sandbox"],
  extraHTTPHeaders: {
    "accept-language": "pt-BR,pt;q=0.9,en;q=0.6"
  },
  headless: !args.headed,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  viewport: { height: 900, width: 1366 }
});
const page = context.pages()[0] ?? await context.newPage();
const outputRows = input.rows.map((item) => alignRow(item.row, outputHeaders.length));
const runSummary = {
  priceCaptured: 0,
  stockCaptured: 0,
  reviewOnlySkipped: 0,
  reviewRequired: 0,
  unavailable: 0,
  statusCounts: {}
};

fs.writeFileSync(outputPath, toCsv([outputHeaders, ...outputRows], input.delimiter), "utf8");

try {
  if (args.loginFirst) {
    await runInteractiveLogin(context, page);
  }

  for (const [index, item] of selectedRows.entries()) {
    process.stdout.write(`[${index + 1}/${selectedRows.length}] ${item.url}\n`);
    const snapshot = await collectUrlSnapshot(page, item, delayMs);
    const row = outputRows[item.originalIndex];

    const normalizedPrice = normalizePrice(snapshot.price);
    const suspiciousPrice = isSuspiciousPrice(normalizedPrice);
    const reviewOnly = isReviewOnlySnapshot({
      normalizedPrice,
      snapshot,
      suspiciousPrice
    });
    const status = suspiciousPrice ? "CONFIG_REQUIRED" : snapshot.status;
    const note = suspiciousPrice
      ? appendNote(snapshot.note, `Preco coletado fora da faixa segura (R$ ${minimumReliablePrice.toFixed(2).replace(".", ",")} a R$ ${maximumReliablePrice.toFixed(2).replace(".", ",")}) e removido para revisao manual.`)
      : snapshot.note;
    const shouldSkipReviewOnly = skipReviewOnly && reviewOnly;

    setColumn(row, outputHeaders, "provider", snapshot.provider);
    setColumn(row, outputHeaders, "titulo_importacao", shouldSkipReviewOnly ? "" : snapshot.title);
    setColumn(row, outputHeaders, "preco_importacao", shouldSkipReviewOnly || suspiciousPrice ? "" : normalizedPrice);
    setColumn(row, outputHeaders, "estoque_importacao", shouldSkipReviewOnly ? "" : snapshot.stock);
    setColumn(row, outputHeaders, "status", shouldSkipReviewOnly ? "" : status);
    setColumn(row, outputHeaders, "note", shouldSkipReviewOnly ? "" : note);
    setColumn(row, outputHeaders, "checkedAt", new Date().toISOString());
    incrementSummary(runSummary, {
      price: shouldSkipReviewOnly || suspiciousPrice ? "" : normalizedPrice,
      reviewOnlySkipped: shouldSkipReviewOnly,
      stock: shouldSkipReviewOnly ? "" : snapshot.stock,
      status: shouldSkipReviewOnly ? "SKIPPED_REVIEW_ONLY" : status
    });
    fs.writeFileSync(outputPath, toCsv([outputHeaders, ...outputRows], input.delimiter), "utf8");
  }
} finally {
  await context.close();
}

console.log(JSON.stringify({
  input: inputPath,
  output: outputPath,
  profile: userDataDir,
  processed: selectedRows.length,
  totalRows: input.rows.length,
  ...runSummary
}, null, 2));

function incrementSummary(summary, snapshot) {
  if (snapshot.reviewOnlySkipped) {
    summary.reviewOnlySkipped += 1;
  }

  if (snapshot.price) {
    summary.priceCaptured += 1;
  }

  if (snapshot.stock) {
    summary.stockCaptured += 1;
  }

  if (snapshot.status === "CONFIG_REQUIRED") {
    summary.reviewRequired += 1;
  }

  if (["OUT_OF_STOCK", "PAUSED", "CLOSED", "DELETED"].includes(snapshot.status)) {
    summary.unavailable += 1;
  }

  summary.statusCounts[snapshot.status] = (summary.statusCounts[snapshot.status] || 0) + 1;
}

function isReviewOnlySnapshot(params) {
  return !params.suspiciousPrice
    && !params.normalizedPrice
    && !params.snapshot.stock
    && params.snapshot.status === "CONFIG_REQUIRED";
}

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
    } else if (value === "--skip-review-only") {
      parsed.skipReviewOnly = true;
    }
  }

  return parsed;
}

function readInputRows(text) {
  const delimiter = detectDelimiter(text);
  const rows = parseCsv(text, delimiter);

  if (!rows.length) {
    throw new Error("Arquivo de entrada sem linhas.");
  }

  if (rows[0].length === 1 && /^https?:\/\//i.test(rows[0][0])) {
    const headers = ["url", ...importColumns];
    return {
      delimiter,
      headers,
      rows: unique(rows.flat().map((value) => normalizeUrl(value)).filter(Boolean)).map((url, originalIndex) => ({
        originalIndex,
        row: [url, "", "", "", "", "", ""],
        url
      }))
    };
  }

  const [headers, ...dataRows] = rows;
  const columns = buildColumnMap(headers);
  const linkColumn = findColumn(columns, ["url", "link", "originalurl", "originalproducturl", "origem"]) ?? findShopifyLinkColumn(headers);

  if (linkColumn === null) {
    throw new Error("Nenhuma coluna de link encontrada. Use url, link, originalUrl ou o CSV preciso baixado no admin.");
  }

  return {
    delimiter,
    headers,
    rows: dataRows
      .map((row) => ({
        row,
        sourceId: readOptionalColumn(row, columns, ["sourceid", "origemid", "idsource"]),
        externalId: readOptionalColumn(row, columns, ["externalid", "idexterno", "itemid", "mlb", "supplierid"]),
        externalShopId: readOptionalColumn(row, columns, ["externalshopid", "shopid", "lojaexterna"]),
        provider: readOptionalColumn(row, columns, ["provider", "fornecedor"]),
        url: normalizeUrl(row[linkColumn] ?? "")
      }))
      .filter((item) => item.url)
      .map((item, originalIndex) => ({ ...item, originalIndex }))
  };
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

async function collectUrlSnapshot(page, item, delayMs) {
  const url = typeof item === "string" ? item : item.url;
  const apiSnapshot = await collectMercadoLivreApiSnapshot(item);

  if (apiSnapshot) {
    return apiSnapshot;
  }

  try {
    await page.goto(url, { timeout: 45_000, waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(delayMs);

    return await page.evaluate(() => {
      const pageUrl = location.href;
      const text = document.body?.innerText ?? "";
      const provider = /shopee\./i.test(pageUrl)
        ? "SHOPEE"
        : /mercadolivre|mercadolibre/i.test(pageUrl)
          ? "MERCADO_LIVRE"
          : "";
      const structured = findStructuredProduct();
      const title = findTitle() || structured.title;
      const price = findBestPrice(text, structured.price, findMeta(["product:price:amount", "price", "twitter:data1"]));
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
        title: title || ""
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

      function findBestPrice(bodyText, structuredPrice, metaPrice) {
        const structuredCandidate = normalizeBrowserPrice(structuredPrice);

        if (isReliableBrowserPrice(structuredCandidate)) {
          return structuredCandidate;
        }

        const metaCandidate = normalizeBrowserPrice(metaPrice);

        if (isReliableBrowserPrice(metaCandidate)) {
          return metaCandidate;
        }

        const domCandidate = findDomPrice();

        if (isReliableBrowserPrice(domCandidate)) {
          return domCandidate;
        }

        return findVisiblePrice(bodyText);
      }

      function findDomPrice() {
        const candidates = [];
        const selectors = [
          "[itemprop='price']",
          "meta[itemprop='price']",
          "[data-testid*='price' i]",
          "[data-testid*='valor' i]",
          "[class*='price' i]",
          "[class*='preco' i]",
          "[class*='andes-money-amount' i]"
        ];

        for (const selector of selectors) {
          for (const node of [...document.querySelectorAll(selector)].slice(0, 80)) {
            const content = node.getAttribute?.("content");
            const value = content || readMoneyElement(node);
            const normalized = normalizeBrowserPrice(value);

            if (!isReliableBrowserPrice(normalized)) {
              continue;
            }

            const context = `${node.getAttribute?.("aria-label") || ""} ${node.textContent || ""}`.trim();

            if (isInstallmentOrSecondaryPrice(context)) {
              continue;
            }

            candidates.push(normalized);
          }
        }

        return candidates[0] || "";
      }

      function readMoneyElement(node) {
        const fraction = node.querySelector?.(".andes-money-amount__fraction")?.textContent?.trim();
        const cents = node.querySelector?.(".andes-money-amount__cents")?.textContent?.trim();

        if (fraction) {
          return cents ? `${fraction},${cents}` : fraction;
        }

        return node.textContent || "";
      }

      function findVisiblePrice(bodyText) {
        const candidates = [...bodyText.matchAll(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2}|[0-9]+(?:\.[0-9]{1,2})?)/g)]
          .map((match) => {
            const rawValue = match[1] || "";
            const context = bodyText.slice(Math.max(0, match.index - 80), Math.min(bodyText.length, match.index + match[0].length + 80));

            return {
              context,
              value: normalizeBrowserPrice(rawValue)
            };
          })
          .filter((candidate) => isReliableBrowserPrice(candidate.value))
          .filter((candidate) => !isInstallmentOrSecondaryPrice(candidate.context));

        return candidates[0]?.value || "";
      }

      function normalizeBrowserPrice(value) {
        const text = String(value || "").trim();

        if (!text) {
          return "";
        }

        const match = text.match(/([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{1,2}|[0-9]+,[0-9]{1,2}|[0-9]+(?:\.[0-9]{1,2})?)/);
        const price = match?.[1] || "";

        if (!price) {
          return "";
        }

        return formatBrowserPrice(price);
      }

      function isReliableBrowserPrice(value) {
        const price = parseBrowserPrice(value);

        return price !== null && price >= 15 && price <= 500;
      }

      function parseBrowserPrice(value) {
        const text = String(value || "").trim();

        if (!text) {
          return null;
        }

        const numberValue = Number(text.replace(/\./g, "").replace(",", "."));

        return Number.isFinite(numberValue) ? numberValue : null;
      }

      function formatBrowserPrice(value) {
        const text = String(value || "").trim();

        if (!text) {
          return "";
        }

        if (text.includes(",")) {
          const [reais, centavos = ""] = text.replace(/\./g, "").split(",");

          return `${reais},${centavos.padEnd(2, "0").slice(0, 2)}`;
        }

        if (/^\d+\.\d{1,2}$/.test(text)) {
          const [reais, centavos = ""] = text.split(".");

          return `${reais},${centavos.padEnd(2, "0").slice(0, 2)}`;
        }

        if (/^\d{4,6}$/.test(text)) {
          const cents = text.slice(-2);
          const reais = text.slice(0, -2);

          return `${reais},${cents}`;
        }

        return `${text},00`;
      }

      function isInstallmentOrSecondaryPrice(context) {
        return /frete|envio|parcela|parcelamento|sem juros|juros|cart[aã]o|pix|cupom|desconto|cashback|moeda|moedas|economize/i.test(context)
          || /\b\d{1,2}\s*x\s*(?:de\s*)?R\$/i.test(context)
          || /R\$\s*[0-9.,]+\s*(?:x|vezes)/i.test(context);
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

        if (/produto removido|an[uú]ncio removido|publica[cç][aã]o removida|produto exclu[ií]do|an[uú]ncio exclu[ií]do|deleted/i.test(joined)) {
          return "DELETED";
        }

        if (/an[uú]ncio finalizado|publica[cç][aã]o finalizada|produto finalizado|encerrad[oa]|finalizad[oa]|ended/i.test(joined)) {
          return "CLOSED";
        }

        if (/pausad[oa]|desativad[oa]|suspens[oa]|an[uú]ncio pausado|publica[cç][aã]o pausada/i.test(joined)) {
          return "PAUSED";
        }

        if (/OutOfStock|esgotado|sem estoque|indisponivel|indisponível/i.test(joined)) {
          return "OUT_OF_STOCK";
        }

        if (/account-verification|captcha|robot|challenge|verifica[cç][aã]o/i.test(pageUrl) || /verifique que voce|verifique que voc[eê]|nao sou um robo|não sou um robô/i.test(joined)) {
          return "CONFIG_REQUIRED";
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

async function collectMercadoLivreApiSnapshot(item) {
  const url = typeof item === "string" ? item : item.url;
  const externalId = extractMercadoLivreItemId(url)
    || normalizeMercadoLivreItemId(typeof item === "string" ? "" : item.externalId);

  if (!externalId) {
    return null;
  }

  try {
    const response = await fetch(`https://api.mercadolibre.com/items/${encodeURIComponent(externalId)}`, {
      headers: {
        accept: "application/json",
        "user-agent": "NerdLingoLab supplier capture"
      }
    });

    if (!response.ok) {
      return null;
    }

    const itemData = await response.json();
    const price = formatPriceFromNumber(itemData?.price);
    const stock = normalizeStockQuantity(itemData?.available_quantity, itemData?.variations);
    const status = mapMercadoLivreApiStatus(itemData?.status, price, stock);

    if (!price && status === "CONFIG_REQUIRED") {
      return null;
    }

    return {
      note: "Coleta via API publica do Mercado Livre.",
      price,
      provider: "MERCADO_LIVRE",
      status,
      stock: stock ?? "",
      title: typeof itemData?.title === "string" ? itemData.title : ""
    };
  } catch {
    return null;
  }
}

function normalizeMercadoLivreItemId(value) {
  const match = String(value ?? "").match(/\bMLB-?(\d{5,})\b/i);

  return match ? `MLB${match[1]}` : "";
}

function extractMercadoLivreItemId(value) {
  const rawValue = String(value ?? "");

  if (!/mercadolivre|mercadolibre|MLB/i.test(rawValue)) {
    return "";
  }

  try {
    const url = new URL(rawValue);
    const queryItemId = normalizeMercadoLivreItemId(url.searchParams.get("wid"))
      || normalizeMercadoLivreItemId(url.searchParams.get("item_id"));

    if (queryItemId) {
      return queryItemId;
    }

    const pathItemId = normalizeMercadoLivreItemId(url.pathname.match(/\/(MLB-?\d{5,})(?:[-_/]|$)/i)?.[1]);

    if (pathItemId && !/\/p\/MLB/i.test(url.pathname)) {
      return pathItemId;
    }
  } catch {
    return normalizeMercadoLivreItemId(rawValue);
  }

  return "";
}

function formatPriceFromNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "";
  }

  return value.toFixed(2).replace(".", ",");
}

function normalizeStockQuantity(value, variations) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.max(0, Math.floor(value)));
  }

  if (Array.isArray(variations)) {
    const total = variations.reduce((sum, variation) => {
      const quantity = variation?.available_quantity;

      return typeof quantity === "number" && Number.isFinite(quantity) ? sum + Math.max(0, Math.floor(quantity)) : sum;
    }, 0);

    return total > 0 ? String(total) : "";
  }

  return "";
}

function mapMercadoLivreApiStatus(status, price, stock) {
  if (status === "active") {
    return price ? "ACTIVE" : stock && stock !== "0" ? "ACTIVE" : "CONFIG_REQUIRED";
  }

  if (status === "paused") {
    return "PAUSED";
  }

  if (status === "closed") {
    return "CLOSED";
  }

  return price ? "ACTIVE" : "CONFIG_REQUIRED";
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

function normalizePrice(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  const match = text.match(/([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{1,2}|[0-9]+,[0-9]{1,2}|[0-9]+(?:\.[0-9]{1,2})?)/);
  const price = match?.[1] ?? text;

  if (price.includes(",")) {
    const [reais, centavos = ""] = price.replace(/\./g, "").split(",");

    return `${reais},${centavos.padEnd(2, "0").slice(0, 2)}`;
  }

  if (/^\d+\.\d{1,2}$/.test(price)) {
    const [reais, centavos = ""] = price.split(".");

    return `${reais},${centavos.padEnd(2, "0").slice(0, 2)}`;
  }

  if (/^\d{4,6}$/.test(price)) {
    return `${price.slice(0, -2)},${price.slice(-2)}`;
  }

  return /^\d+$/.test(price) ? `${price},00` : price;
}

function isSuspiciousPrice(value) {
  const price = parsePrice(value);

  return price !== null && (price < minimumReliablePrice || price > maximumReliablePrice);
}

function parsePrice(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const numberValue = Number(text.replace(/\./g, "").replace(",", "."));

  return Number.isFinite(numberValue) ? numberValue : null;
}

function appendNote(note, suffix) {
  const text = String(note ?? "").trim();

  return text ? `${text} ${suffix}` : suffix;
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

function buildColumnMap(headers) {
  return new Map(headers.map((name, index) => [normalizeHeader(name), index]));
}

function findColumn(columns, names) {
  for (const name of names) {
    const index = columns.get(normalizeHeader(name));

    if (typeof index === "number") {
      return index;
    }
  }

  return null;
}

function readOptionalColumn(row, columns, names) {
  const index = findColumn(columns, names);

  return typeof index === "number" ? String(row[index] ?? "").trim() : "";
}

function findShopifyLinkColumn(headers) {
  const index = headers.findIndex((name) => /^link(?:\s*\(|$)/i.test(String(name).trim()));

  return index >= 0 ? index : null;
}

function ensureColumns(headers, columns) {
  const output = [...headers];
  const existing = buildColumnMap(output);

  for (const column of columns) {
    if (!existing.has(normalizeHeader(column))) {
      existing.set(normalizeHeader(column), output.length);
      output.push(column);
    }
  }

  return output;
}

function alignRow(row, length) {
  const output = [...row];

  while (output.length < length) {
    output.push("");
  }

  return output;
}

function setColumn(row, headers, column, value) {
  const index = buildColumnMap(headers).get(normalizeHeader(column));

  if (typeof index === "number") {
    row[index] = String(value ?? "");
  }
}

function unique(values) {
  return Array.from(new Set(values));
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function toCsv(rows, delimiter) {
  return `${rows.map((row) => row.map((value) => csvCell(value, delimiter)).join(delimiter)).join("\r\n")}\r\n`;
}

function csvCell(value, delimiter) {
  const text = String(value ?? "");
  const needsQuote = text.includes(delimiter) || /["\r\n]/.test(text);

  return needsQuote ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function parseCsv(text, delimiter) {
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
    } else if (char === delimiter) {
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

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  let isQuoted = false;
  const counts = new Map(candidates.map((candidate) => [candidate, 0]));

  for (let index = 0; index < firstLine.length; index += 1) {
    const char = firstLine[index];
    const nextChar = firstLine[index + 1];

    if (char === "\"" && nextChar === "\"") {
      index += 1;
      continue;
    }

    if (char === "\"") {
      isQuoted = !isQuoted;
      continue;
    }

    if (!isQuoted && counts.has(char)) {
      counts.set(char, (counts.get(char) ?? 0) + 1);
    }
  }

  for (const candidate of candidates) {
    const count = counts.get(candidate) ?? 0;

    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}
