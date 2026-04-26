import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ProductStatus } from "../src/generated/prisma/client.ts";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://nerdlingolab:nerdlingolab_dev_password@localhost:5432/nerdlingolab"
});
const prisma = new PrismaClient({ adapter });
const repositoryCsvPath = path.resolve("data/shopify/products_export_1.csv");
const desktopCsvPath = "C:/Users/samue/Desktop/products_export_1.csv";
const defaultCsvPath = fs.existsSync(repositoryCsvPath) ? repositoryCsvPath : desktopCsvPath;
const defaultStock = Number.parseInt(process.env.SHOPIFY_IMPORT_DEFAULT_STOCK ?? "10", 10);

const baseCategories = [
  ["catalogo", "Catálogo", 10, "Todos os produtos publicados."],
  ["camisetas", "Camisetas", 20, "Camisetas, regatas e peças de vestuário geek."],
  ["linguas", "Línguas", 30, "Produtos com temas de idiomas, frases e cultura japonesa."],
  ["geek", "Geek", 40, "Coleção geek geral."],
  ["anime", "Anime", 50, "Produtos inspirados em anime."],
  ["oversized", "Oversized", 60, "Modelagens oversized e streetwear."],
  ["action-figures", "Action Figures", 70, "Colecionáveis e figuras decorativas."],
  ["temporada", "Temporada", 80, "Produtos sazonais e campanhas temporárias."],
  ["ofertas", "Ofertas", 90, "Produtos com preço promocional."],
  ["novidades", "Novidades", 100, "Produtos marcados como novidade."],
  ["mais-vendidos", "Mais Vendidos", 110, "Produtos ativos e disponíveis para compra."]
];

const args = parseArgs(process.argv.slice(2));
const csvPath = path.resolve(args.file ?? process.env.SHOPIFY_PRODUCTS_CSV ?? defaultCsvPath);
const isDryRun = Boolean(args.dryRun);
const limit = args.limit ? Number.parseInt(args.limit, 10) : undefined;

try {
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const [header, ...dataRows] = rows;
  const columns = Object.fromEntries(header.map((name, index) => [name, index]));
  const groupedRows = groupByHandle(dataRows, columns);
  const products = [...groupedRows.entries()].slice(0, limit).map(([handle, productRows]) =>
    normalizeProduct(handle, productRows, columns)
  );

  const summary = summarize(products);

  if (isDryRun) {
    console.log(JSON.stringify({ dryRun: true, file: csvPath, ...summary }, null, 2));
  } else {
    await importProducts(products);
    console.log(JSON.stringify({ dryRun: false, file: csvPath, ...summary }, null, 2));
  }
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
    } else if (value === "--limit") {
      parsed.limit = rawArgs[index + 1];
      index += 1;
    }
  }

  return parsed;
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

function normalizeProduct(handle, rows, columns) {
  const firstRow = rows[0];
  const title = getCell(firstRow, columns, "Title") || toTitle(handle);
  const description = stripHtml(getCell(firstRow, columns, "Body (HTML)"));
  const sourceHash = stableHash(handle).toString(36).toUpperCase().padStart(6, "0");
  const tags = unique([
    ...splitTags(getCell(firstRow, columns, "Tags")),
    `ShopifyHandle_${sourceHash}`,
    ...extractCollectionTags(firstRow, columns, title),
    ...rows.flatMap((row) => extractVariantTags(row, columns))
  ]);
  const categorySlug = inferCategorySlug(firstRow, columns, tags, title);
  const variants = normalizeVariants(handle, rows, columns, title);
  const activeVariants = variants.filter((variant) => variant.isActive && variant.priceCents > 0);
  const priceCents = Math.min(...activeVariants.map((variant) => variant.priceCents));
  const compareAtPriceCents = minOptional(activeVariants.map((variant) => variant.compareAtPriceCents));
  const status = isActiveProduct(firstRow, columns) && activeVariants.length > 0 ? ProductStatus.ACTIVE : ProductStatus.DRAFT;

  return {
    brand: getCell(firstRow, columns, "Vendor") || "NerdLingoLab",
    categorySlug,
    compareAtPriceCents: compareAtPriceCents && compareAtPriceCents > priceCents ? compareAtPriceCents : null,
    description: description || title,
    images: unique(rows.flatMap((row) => [getCell(row, columns, "Image Src"), getCell(row, columns, "Variant Image")]).filter(Boolean))
      .map((url, index) => ({ alt: title, position: index + 1, url })),
    priceCents: Number.isFinite(priceCents) ? priceCents : 0,
    publishedAt: status === ProductStatus.ACTIVE ? new Date() : null,
    seoDescription: getCell(firstRow, columns, "SEO Description") || shortText(description, 155),
    seoTitle: getCell(firstRow, columns, "SEO Title") || title,
    shortDescription: shortText(description, 180),
    sourceHandle: handle,
    slug: makeProductSlug(handle, title),
    status,
    tags,
    title,
    variants
  };
}

function normalizeVariants(handle, rows, columns, title) {
  const seen = new Set();
  const variants = [];

  for (const row of rows) {
    const priceCents = readPrice(row, columns, "Variant Price") ?? readPrice(row, columns, "Price / Brasil");

    if (!priceCents) {
      continue;
    }

    const optionValues = extractOptionValues(row, columns);
    const variantTitle = Object.entries(optionValues)
      .filter(([key, value]) => !key.startsWith("_") && Boolean(value))
      .map(([, value]) => String(value))
      .join(" / ") || "Padrão";
    const signature = JSON.stringify({ optionValues, priceCents });

    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    variants.push({
      barcode: getCell(row, columns, "Variant Barcode") || null,
      compareAtPriceCents:
        readPrice(row, columns, "Variant Compare At Price") ?? readPrice(row, columns, "Compare At Price / Brasil") ?? null,
      isActive: isActiveProduct(row, columns),
      optionValues,
      priceCents,
      sku: makeSku(handle, variants.length + 1),
      stockQuantity: isActiveProduct(row, columns) ? defaultStock : 0,
      title: variantTitle,
      weightGrams: readInteger(row, columns, "Variant Grams")
    });
  }

  if (variants.length === 0) {
    variants.push({
      barcode: null,
      compareAtPriceCents: null,
      isActive: true,
      optionValues: {},
      priceCents: 0,
      sku: makeSku(handle, 1),
      stockQuantity: defaultStock,
      title: title || "Padrão",
      weightGrams: null
    });
  }

  return variants;
}

async function importProducts(products) {
  const categoryMap = new Map();

  await prisma.category.updateMany({
    data: { slug: "catalogo" },
    where: { slug: "catálogo" }
  });

  for (const [slug, name, position, description] of baseCategories) {
    const category = await prisma.category.upsert({
      create: { description, isActive: true, name, position, slug },
      update: { description, isActive: true, name, position },
      where: { slug }
    });
    categoryMap.set(slug, category.id);
  }

  for (const product of products) {
    await prisma.$transaction(async (tx) => {
      const existingProduct = await tx.product.findFirst({
        where: {
          OR: [
            { slug: product.slug },
            { slug: product.sourceHandle },
            { tags: { has: product.tags.find((tag) => tag.startsWith("ShopifyHandle_")) } }
          ]
        }
      });

      const productData = {
        brand: product.brand,
        categoryId: categoryMap.get(product.categorySlug) ?? categoryMap.get("catalogo"),
        compareAtPriceCents: product.compareAtPriceCents,
        description: product.description,
        images: product.images,
        priceCents: product.priceCents,
        publishedAt: product.publishedAt,
        seoDescription: product.seoDescription,
        seoTitle: product.seoTitle,
        shortDescription: product.shortDescription,
        slug: product.slug,
        status: product.status,
        tags: product.tags,
        title: product.title
      };

      const savedProduct = existingProduct
        ? await tx.product.update({
            data: productData,
            where: { id: existingProduct.id }
          })
        : await tx.product.create({
            data: productData
          });

      await tx.productVariant.deleteMany({ where: { productId: savedProduct.id } });
      await tx.productVariant.createMany({
        data: product.variants.map((variant) => ({
          ...variant,
          productId: savedProduct.id
        }))
      });
    });
  }
}

function summarize(products) {
  const categories = {};
  let variants = 0;
  let images = 0;
  let activeProducts = 0;

  for (const product of products) {
    categories[product.categorySlug] = (categories[product.categorySlug] ?? 0) + 1;
    variants += product.variants.length;
    images += product.images.length;
    activeProducts += product.status === ProductStatus.ACTIVE ? 1 : 0;
  }

  return {
    activeProducts,
    categories,
    categoryCount: baseCategories.length,
    imageCount: images,
    productCount: products.length,
    variantCount: variants
  };
}

function extractCollectionTags(row, columns, title) {
  const tags = ["Colecao_Catalogo"];
  const badge = getCell(row, columns, "Badge do Produto (product.metafields.nerdling.product_badge)");
  const titleLower = title.toLowerCase();

  if (badge.toLowerCase().includes("novo")) {
    tags.push("Colecao_Novidades", "Novidades");
  }

  if (!titleLower.includes("teste")) {
    tags.push("Colecao_MaisVendidos", "Mais Vendidos");
  }

  return tags;
}

function extractVariantTags(row, columns) {
  return [
    getCell(row, columns, "Cor (product.metafields.shopify.color-pattern)") ? `Cor_${getCell(row, columns, "Cor (product.metafields.shopify.color-pattern)")}` : "",
    getCell(row, columns, "Tamanho (product.metafields.shopify.size)") ? `Tamanho_${getCell(row, columns, "Tamanho (product.metafields.shopify.size)")}` : "",
    getCell(row, columns, "Gênero alvo (product.metafields.shopify.target-gender)") ? `Gênero_${getCell(row, columns, "Gênero alvo (product.metafields.shopify.target-gender)")}` : ""
  ].filter(Boolean);
}

function extractOptionValues(row, columns) {
  const values = {};

  for (const number of [1, 2, 3]) {
    const name = getCell(row, columns, `Option${number} Name`);
    const value = getCell(row, columns, `Option${number} Value`);

    if (name && value && value !== "Default Title") {
      values[name] = value;
    }
  }

  const option1Value = getCell(row, columns, "Option1 Value");
  const option2Value = getCell(row, columns, "Option2 Value");
  const color = values.Cor ?? option1Value ?? getCell(row, columns, "Cor (product.metafields.shopify.color-pattern)");
  const size = values.Tamanho ?? option2Value ?? getCell(row, columns, "Tamanho (product.metafields.shopify.size)");
  const gender = getCell(row, columns, "Gênero alvo (product.metafields.shopify.target-gender)");
  const variantImage = getCell(row, columns, "Variant Image") || getCell(row, columns, "Image Src");
  const imageAlt = getCell(row, columns, "Image Alt Text");

  if (color && color !== "Default Title" && !values.Cor) {
    values.Cor = normalizeOptionValue(color);
  }

  if (size && size !== "Default Title" && !values.Tamanho) {
    values.Tamanho = normalizeOptionValue(size);
  }

  if (gender) {
    values.Genero = normalizeOptionValue(gender);
  }

  if (variantImage) {
    values._imageUrl = variantImage;
  }

  if (imageAlt) {
    values._imageAlt = imageAlt;
  }

  return values;
}

function normalizeOptionValue(value) {
  return String(value).split(";")[0]?.trim() ?? String(value).trim();
}

function inferCategorySlug(row, columns, tags, title) {
  const type = getCell(row, columns, "Type").toLowerCase();
  const haystack = `${title} ${type} ${tags.join(" ")}`.toLowerCase();

  if (haystack.includes("action figure") || haystack.includes("colecionável") || haystack.includes("pvc")) {
    return "action-figures";
  }

  if (haystack.includes("oversized") || haystack.includes("streetwear")) {
    return "oversized";
  }

  if (haystack.includes("anime")) {
    return "anime";
  }

  if (haystack.includes("japones") || haystack.includes("língua") || haystack.includes("lingua") || haystack.includes("idioma")) {
    return "linguas";
  }

  if (haystack.includes("geek")) {
    return "geek";
  }

  if (type.includes("camiseta") || type.includes("camisa") || type.includes("regata") || type.includes("kit casal")) {
    return "camisetas";
  }

  return "catalogo";
}

function isActiveProduct(row, columns) {
  return getCell(row, columns, "Status").toLowerCase() !== "draft" && getCell(row, columns, "Published").toLowerCase() !== "false";
}

function readPrice(row, columns, name) {
  const rawValue = getCell(row, columns, name);

  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.replace(/[^\d,.]/g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);

  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

function readInteger(row, columns, name) {
  const value = Number.parseInt(getCell(row, columns, name), 10);

  return Number.isFinite(value) ? value : null;
}

function getCell(row, columns, name) {
  return (row[columns[name]] ?? "").trim();
}

function splitTags(rawValue) {
  return rawValue.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function unique(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function minOptional(values) {
  const numbers = values.filter((value) => Number.isFinite(value));

  return numbers.length > 0 ? Math.min(...numbers) : null;
}

function stripHtml(value) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function shortText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}…`;
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

function makeSku(handle, index) {
  const normalizedHandle = slugify(handle).toUpperCase();
  const hash = stableHash(handle).toString(36).toUpperCase().padStart(6, "0");

  return `SHOPIFY-${hash}-${String(index).padStart(3, "0")}-${normalizedHandle}`.slice(0, 80);
}

function stableHash(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
