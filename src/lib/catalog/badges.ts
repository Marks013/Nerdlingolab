import type { ProductListItem } from "@/lib/catalog/queries";

const NEW_PRODUCT_DAYS = 30;

export type ProductBadgeTone = "black" | "cyan" | "orange" | "purple" | "red";

export interface ProductBadge {
  label: string;
  tone: ProductBadgeTone;
}

type BadgeProduct = Pick<ProductListItem, "compareAtPriceCents" | "createdAt" | "priceCents" | "tags">;

const campaignBadges: Array<{ aliases: string[]; badge: ProductBadge }> = [
  { aliases: ["blackfriday", "black friday", "black-friday"], badge: { label: "Black Friday", tone: "black" } },
  { aliases: ["lancamento", "lançamento", "launch"], badge: { label: "Lançamento", tone: "purple" } },
  { aliases: ["desconto", "descontos", "sale"], badge: { label: "Desconto", tone: "red" } },
  { aliases: ["promocao", "promoção", "promocional"], badge: { label: "Promoção", tone: "orange" } }
];

export function getProductBadges(product: BadgeProduct, now = new Date()): ProductBadge[] {
  const badges: ProductBadge[] = [];
  const normalizedTags = new Set(product.tags.map(normalizeTag));
  const hasDiscount = Boolean(product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents);

  if (isNewProduct(product.createdAt, now)) {
    badges.push({ label: "Novo", tone: "cyan" });
  }

  for (const campaign of campaignBadges) {
    if (campaign.aliases.some((alias) => normalizedTags.has(normalizeTag(alias)))) {
      badges.push(campaign.badge);
    }
  }

  if (hasDiscount && !badges.some((badge) => ["Desconto", "Promoção", "Black Friday"].includes(badge.label))) {
    badges.push({ label: "Oferta", tone: "orange" });
  }

  return dedupeBadges(badges).slice(0, 3);
}

export function getProductBadgeClass(tone: ProductBadgeTone): string {
  const classes: Record<ProductBadgeTone, string> = {
    black: "bg-[#111827] text-white",
    cyan: "bg-[#00a8c8] text-white",
    orange: "bg-primary text-white",
    purple: "bg-secondary text-white",
    red: "bg-[#c72046] text-white"
  };

  return classes[tone];
}

function isNewProduct(createdAt: Date, now: Date): boolean {
  const ageMs = now.getTime() - createdAt.getTime();
  const maxAgeMs = NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;

  return ageMs >= 0 && ageMs <= maxAgeMs;
}

function normalizeTag(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ");
}

function dedupeBadges(badges: ProductBadge[]): ProductBadge[] {
  const seenLabels = new Set<string>();

  return badges.filter((badge) => {
    if (seenLabels.has(badge.label)) {
      return false;
    }

    seenLabels.add(badge.label);
    return true;
  });
}
