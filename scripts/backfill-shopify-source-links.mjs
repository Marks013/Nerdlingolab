import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://nerdlingolab:nerdlingolab_dev_password@localhost:5432/nerdlingolab"
});
const prisma = new PrismaClient({ adapter });
const repositoryCsvPath = path.resolve("data/shopify/products_export_1.csv");
const desktopCsvPath = "C:/Users/samue/Desktop/products_export_1.csv";
const defaultCsvPath = fs.existsSync(repositoryCsvPath) ? repositoryCsvPath : desktopCsvPath;
const args = parseArgs(process.argv.slice(2));
const csvPath = path.resolve(args.file ?? process.env.SHOPIFY_PRODUCTS_CSV ?? defaultCsvPath);
const isDryRun = Boolean(args.dryRun);
const adminMetafieldKey = "admin.originalProductUrl";

try {
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const [header, ...dataRows] = rows;
  const columns = Object.fromEntries(header.map((name, index) => [name, index]));
  const groupedRows = groupByHandle(dataRows, columns);
  const result = await backfillSourceLinks(groupedRows, columns);

  console.log(JSON.stringify({ dryRun: isDryRun, file: csvPath, metafield: adminMetafieldKey, ...result }, null, 2));
} finally {
  await prisma.$disconnect();
}

function parseArgs(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const value = rawArgs[index];

    if (value === "--dry-run") {
      parsed.dryRun = true;
    } else if (value === "--file") {
      parsed.file = rawArgs[index + 1];
      index += 1;
    }
  }

  return parsed;
}

async function backfillSourceLinks(groupedRows, columns) {
  let csvProductsWithLink = 0;
  let matchedProducts = 0;
  let updatedProducts = 0;
  let alreadyFilled = 0;
  const missingHandles = [];

  for (const [handle, productRows] of groupedRows.entries()) {
    const firstRow = productRows[0];
    const originalProductUrl = getSourceProductUrl(firstRow, columns);

    if (!originalProductUrl) {
      continue;
    }

    csvProductsWithLink += 1;

    const title = getCell(firstRow, columns, "Title") || toTitle(handle);
    const sourceTag = `ShopifyHandle_${stableHash(handle).toString(36).toUpperCase().padStart(6, "0")}`;
    const product = await prisma.product.findFirst({
      select: {
        id: true,
        metafields: true,
        slug: true,
        title: true
      },
      where: {
        OR: [
          { tags: { has: sourceTag } },
          { slug: makeProductSlug(handle, title) },
          { slug: handle }
        ]
      }
    });

    if (!product) {
      missingHandles.push(handle);
      continue;
    }

    matchedProducts += 1;

    const metafields = normalizeMetafields(product.metafields);

    if (metafields[adminMetafieldKey] === originalProductUrl) {
      alreadyFilled += 1;
      continue;
    }

    if (!isDryRun) {
      await prisma.product.update({
        data: {
          metafields: {
            ...metafields,
            [adminMetafieldKey]: originalProductUrl
          }
        },
        where: { id: product.id }
      });
    }

    updatedProducts += 1;
  }

  return {
    alreadyFilled,
    csvProductsWithLink,
    matchedProducts,
    missingCount: missingHandles.length,
    missingHandles: missingHandles.slice(0, 25),
    updatedProducts
  };
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

  return rows.filter((currentRow) => currentRow.some(Boolean));
}

function groupByHandle(rows, columns) {
  const groupedRows = new Map();

  for (const row of rows) {
    const handle = getCell(row, columns, "Handle");

    if (!handle) {
      continue;
    }

    groupedRows.set(handle, [...(groupedRows.get(handle) ?? []), row]);
  }

  return groupedRows;
}

function getSourceProductUrl(row, columns) {
  const linkColumn = Object.keys(columns).find((name) => name === "Link" || name.startsWith("Link ("));
  const rawValue = linkColumn ? getCell(row, columns, linkColumn) : "";

  return normalizeSourceUrl(rawValue);
}

function normalizeSourceUrl(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  try {
    const url = new URL(rawValue.startsWith("//") ? `https:${rawValue}` : rawValue);

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return rawValue;
  }
}

function normalizeMetafields(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function getCell(row, columns, name) {
  return (row[columns[name]] ?? "").trim();
}

function toTitle(slug) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function makeProductSlug(handle, title) {
  const source = isCleanHandle(handle) ? handle : title;
  const baseSlug = slugify(source).slice(0, 70).replace(/-$/g, "") || "produto";
  const hash = stableHash(handle).toString(36).toLowerCase().padStart(6, "0");

  return `${baseSlug}-${hash}`;
}

function isCleanHandle(handle) {
  return handle.length <= 90 && !/^https?:/i.test(handle) && !handle.toLowerCase().includes("mercadolivre");
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stableHash(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
