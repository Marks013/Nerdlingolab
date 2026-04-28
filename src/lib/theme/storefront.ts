import { prisma } from "@/lib/prisma";
import { normalizeImageUrl } from "@/lib/images";
import { normalizeLocalOrHttpUrl } from "@/lib/urls";

export interface StorefrontSlide {
  alt: string;
  desktop?: string;
  href: string;
  mobile?: string;
  src?: string;
}

export interface StorefrontThemeView {
  announcementText: string;
  freeShippingThresholdCents: number;
  footerNotice: string;
  heroSlides: StorefrontSlide[];
  instagramUrl: string;
  name: string;
  newsletterDescription: string;
  newsletterTitle: string;
  promoSlides: StorefrontSlide[];
  supportEmail: string;
  whatsappLabel: string;
}

export const defaultThemeText = {
  announcementText: "FRETE GRÁTIS em compras acima de R$99,90",
  freeShippingThresholdCents: 9_990,
  footerNotice: "Oferta exclusiva neste site oficial, sujeita a variação. Evite comprar produtos mais baratos ou de outras lojas, para evitar golpes.",
  instagramUrl: "https://instagram.com/nerdlingolab",
  newsletterDescription: "Inscreva-se para receber descontos exclusivos direto no seu e-mail!",
  newsletterTitle: "Receba nossas promoções",
  supportEmail: "nerdlingolab@gmail.com",
  whatsappLabel: "(44) 99136-2488"
};

export const defaultHeroSlides: StorefrontSlide[] = [
  {
    alt: "Banner NerdLingoLab de camisetas e cultura pop",
    desktop: "https://nerdlingolab.com/cdn/shop/files/BANNER_01_PC_-_NERDLINGOLAB_II_1.webp?v=1774055688&width=1800",
    href: "/produtos",
    mobile: "https://nerdlingolab.com/cdn/shop/files/BANNER_01_MOBI_-_NERDLINGOLAB_II_1.webp?v=1774055688&width=900"
  },
  {
    alt: "Banner NerdLingoLab com novidades da loja",
    desktop: "https://nerdlingolab.com/cdn/shop/files/BANNER_03_PC_-_NERDLINGOLAB.webp?v=1774055689&width=1800",
    href: "/produtos?ordem=recentes",
    mobile: "https://nerdlingolab.com/cdn/shop/files/BANNER_03_MOBI_-_NERDLINGOLAB.webp?v=1774055689&width=900"
  },
  {
    alt: "Banner NerdLingoLab de ofertas especiais",
    desktop: "https://nerdlingolab.com/cdn/shop/files/BANNER_PC_NERDLINGOLAB_-_01.webp?v=1774055689&width=1800",
    href: "/ofertas",
    mobile: "https://nerdlingolab.com/cdn/shop/files/BANNER_01_MOBI_-_NERDILONGLAB.webp?v=1774055689&width=900"
  },
  {
    alt: "Banner NerdLingoLab de temporada",
    desktop: "https://nerdlingolab.com/cdn/shop/files/BANNER_02_PC_-_NERDLONGLAB.webp?v=1774055689&width=1800",
    href: "/produtos?categoria=temporada",
    mobile: "https://nerdlingolab.com/cdn/shop/files/BANNER_02_MOBI_-_NERDLONGOLAB.webp?v=1774055689&width=900"
  }
];

export const defaultPromoSlides: StorefrontSlide[] = [
  {
    alt: "Banner NerdLingoLab de frete e campanha",
    desktop: "https://nerdlingolab.com/cdn/shop/files/BANNER_04_PC_-_NERDLINGOLAB.webp?v=1774055689&width=1800",
    href: "/ofertas",
    mobile: "https://nerdlingolab.com/cdn/shop/files/BANNER_04_MOBI_-_NERDLINGOLAB.webp?v=1774055689&width=900"
  },
  {
    alt: "Sobre a loja NerdLingoLab",
    href: "#sobre",
    src: "https://nerdlingolab.com/cdn/shop/files/SOBRE_A_LOJA_-_NERDLINGOLAB.webp?v=1774055689&width=800"
  }
];

export async function getStorefrontTheme(): Promise<StorefrontThemeView> {
  try {
    const theme = await prisma.storefrontTheme.findUnique({
      where: { singletonKey: "default" }
    });

    return {
      announcementText: readLimitedText(theme?.announcementText, defaultThemeText.announcementText, 120),
      freeShippingThresholdCents: readMoneyCents(
        theme?.freeShippingThresholdCents,
        defaultThemeText.freeShippingThresholdCents
      ),
      footerNotice: readLimitedText(theme?.footerNotice, defaultThemeText.footerNotice, 320),
      heroSlides: normalizeSlides(theme?.heroSlides, defaultHeroSlides),
      instagramUrl: readUrl(theme?.instagramUrl, defaultThemeText.instagramUrl),
      name: theme?.name ?? "Tema principal",
      newsletterDescription: readLimitedText(
        theme?.newsletterDescription,
        defaultThemeText.newsletterDescription,
        220
      ),
      newsletterTitle: readLimitedText(theme?.newsletterTitle, defaultThemeText.newsletterTitle, 80),
      promoSlides: normalizeSlides(theme?.promoSlides, defaultPromoSlides),
      supportEmail: readLimitedText(theme?.supportEmail, defaultThemeText.supportEmail, 120),
      whatsappLabel: readLimitedText(theme?.whatsappLabel, defaultThemeText.whatsappLabel, 80)
    };
  } catch {
    return getDefaultStorefrontTheme();
  }
}

export function getDefaultStorefrontTheme(): StorefrontThemeView {
  return {
    ...defaultThemeText,
    heroSlides: defaultHeroSlides,
    name: "Tema principal",
    promoSlides: defaultPromoSlides
  };
}

export function normalizeSlides(value: unknown, fallback: StorefrontSlide[]): StorefrontSlide[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const slides = value
    .map((item) => normalizeSlide(item))
    .filter((item): item is StorefrontSlide => Boolean(item));

  return slides.length > 0 ? slides : fallback;
}

function normalizeSlide(value: unknown): StorefrontSlide | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const slide = value as Record<string, unknown>;
  const alt = readSlideText(slide.alt);
  const href = readSlideHref(slide.href);
  const desktop = readAssetPath(slide.desktop);
  const mobile = readAssetPath(slide.mobile);
  const src = readAssetPath(slide.src);

  if (!alt || !href || (!src && !desktop && !mobile)) {
    return null;
  }

  return {
    alt,
    href,
    ...(desktop ? { desktop } : {}),
    ...(mobile ? { mobile } : {}),
    ...(src ? { src } : {})
  };
}

function readSlideText(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";

  return text.length > 0 && text.length <= 160 ? text : undefined;
}

function readSlideHref(value: unknown): string {
  return normalizeLocalOrHttpUrl(value) ?? "/produtos";
}

function readAssetPath(value: unknown): string | undefined {
  return normalizeImageUrl(value) ?? undefined;
}

function readLimitedText(value: unknown, fallback: string, maxLength: number): string {
  const text = typeof value === "string" ? value.trim() : "";

  return text.length > 0 && text.length <= maxLength ? text : fallback;
}

function readMoneyCents(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1_000_000
    ? value
    : fallback;
}

function readUrl(value: unknown, fallback: string): string {
  return normalizeLocalOrHttpUrl(value) ?? fallback;
}
