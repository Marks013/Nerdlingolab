"use server";

import type { Prisma } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import { internalizeExternalMediaUrl } from "@/lib/media/import-external";
import { syncMediaUsages } from "@/lib/media/assets";
import {
  defaultThemeText,
  defaultHeroSlides,
  defaultPromoSlides,
  normalizeSlides,
  type StorefrontSlide
} from "@/lib/theme/storefront";
import { prisma } from "@/lib/prisma";
import { normalizeLocalOrHttpUrl } from "@/lib/urls";

const MAX_SLIDES = 8;

export async function updateStorefrontTheme(formData: FormData): Promise<void> {
  await requireAdmin();

  const name = readText(formData, "name") || "Tema principal";
  const textSettings = readThemeTextSettings(formData);
  const heroSlides = await internalizeSlideImages(readSlides(formData, "hero", defaultHeroSlides));
  const promoSlides = await internalizeSlideImages(readSlides(formData, "promo", defaultPromoSlides));

  try {
    await prisma.storefrontTheme.upsert({
      where: { singletonKey: "default" },
      select: { id: true },
      create: {
        heroSlides: toJson(heroSlides),
        name,
        promoSlides: toJson(promoSlides),
        singletonKey: "default",
        ...textSettings
      },
      update: {
        heroSlides: toJson(heroSlides),
        name,
        promoSlides: toJson(promoSlides),
        ...textSettings
      }
    });
  } catch (error) {
    if (isMissingFreeShippingColumn(error)) {
      await saveThemeWithoutFreeShippingThreshold({
        heroSlides,
        name,
        promoSlides,
        textSettings
      });
    } else {
      Sentry.captureException(error, {
        tags: { feature: "storefront-theme", operation: "update" }
      });
      throw new Error("Não foi possível salvar o tema da vitrine.");
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/tema");

  await syncStorefrontThemeMediaUsages(heroSlides, promoSlides);
}

export async function resetStorefrontTheme(): Promise<void> {
  await requireAdmin();

  try {
    await prisma.storefrontTheme.upsert({
      where: { singletonKey: "default" },
      select: { id: true },
      create: {
        heroSlides: toJson(defaultHeroSlides),
        name: "Tema principal",
        promoSlides: toJson(defaultPromoSlides),
        singletonKey: "default",
        ...defaultThemeText
      },
      update: {
        heroSlides: toJson(defaultHeroSlides),
        name: "Tema principal",
        promoSlides: toJson(defaultPromoSlides),
        ...defaultThemeText
      }
    });
  } catch (error) {
    if (isMissingFreeShippingColumn(error)) {
      await saveThemeWithoutFreeShippingThreshold({
        heroSlides: defaultHeroSlides,
        name: "Tema principal",
        promoSlides: defaultPromoSlides,
        textSettings: defaultThemeText
      });
    } else {
      Sentry.captureException(error, {
        tags: { feature: "storefront-theme", operation: "reset" }
      });
      throw new Error("Não foi possível restaurar o tema padrão.");
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/tema");

  await syncStorefrontThemeMediaUsages(defaultHeroSlides, defaultPromoSlides);
}

function readSlides(formData: FormData, group: "hero" | "promo", fallback: StorefrontSlide[]): StorefrontSlide[] {
  const rawSlides: StorefrontSlide[] = [];

  for (let index = 0; index < MAX_SLIDES; index += 1) {
    const enabled = formData.get(`${group}-${index}-enabled`) === "on";
    const alt = readText(formData, `${group}-${index}-alt`);
    const href = readText(formData, `${group}-${index}-href`);
    const desktop = readText(formData, `${group}-${index}-desktop`);
    const mobile = readText(formData, `${group}-${index}-mobile`);
    const src = readText(formData, `${group}-${index}-src`);

    if (!enabled && !alt && !href && !desktop && !mobile && !src) {
      continue;
    }

    if (!enabled) {
      continue;
    }

    rawSlides.push({
      alt,
      desktop,
      href,
      mobile,
      src
    });
  }

  return normalizeSlides(rawSlides, fallback);
}

function readText(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value.trim() : "";
}

function readThemeTextSettings(formData: FormData) {
  return {
    announcementText: readLimitedText(formData, "announcementText", defaultThemeText.announcementText, 120),
    freeShippingThresholdCents: readMoneyCents(
      formData,
      "freeShippingThresholdCents",
      defaultThemeText.freeShippingThresholdCents
    ),
    footerNotice: readLimitedText(formData, "footerNotice", defaultThemeText.footerNotice, 320),
    instagramUrl: readUrl(formData, "instagramUrl", defaultThemeText.instagramUrl),
    newsletterDescription: readLimitedText(
      formData,
      "newsletterDescription",
      defaultThemeText.newsletterDescription,
      220
    ),
    newsletterTitle: readLimitedText(formData, "newsletterTitle", defaultThemeText.newsletterTitle, 80),
    supportEmail: readLimitedText(formData, "supportEmail", defaultThemeText.supportEmail, 120),
    whatsappLabel: readLimitedText(formData, "whatsappLabel", defaultThemeText.whatsappLabel, 80)
  };
}

function readLimitedText(formData: FormData, fieldName: string, fallback: string, maxLength: number): string {
  const text = readText(formData, fieldName);

  return text.length > 0 && text.length <= maxLength ? text : fallback;
}

function readUrl(formData: FormData, fieldName: string, fallback: string): string {
  return normalizeLocalOrHttpUrl(readText(formData, fieldName)) ?? fallback;
}

function readMoneyCents(formData: FormData, fieldName: string, fallback: number): number {
  const rawValue = readText(formData, fieldName).replace(/\./g, "").replace(",", ".");
  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < 0 || value > 10_000) {
    return fallback;
  }

  return Math.round(value * 100);
}

function toJson(slides: StorefrontSlide[]): Prisma.InputJsonValue {
  return slides.map((slide) => ({
    alt: slide.alt,
    href: slide.href,
    ...(slide.desktop ? { desktop: slide.desktop } : {}),
    ...(slide.mobile ? { mobile: slide.mobile } : {}),
    ...(slide.src ? { src: slide.src } : {})
  })) as Prisma.InputJsonValue;
}

async function syncStorefrontThemeMediaUsages(
  heroSlides: StorefrontSlide[],
  promoSlides: StorefrontSlide[]
): Promise<void> {
  try {
    await Promise.all([
      syncMediaUsages({
        fieldName: "heroSlides",
        ownerId: "default",
        ownerType: "STOREFRONT_THEME",
        urls: extractSlideUrls(heroSlides)
      }),
      syncMediaUsages({
        fieldName: "promoSlides",
        ownerId: "default",
        ownerType: "STOREFRONT_THEME",
        urls: extractSlideUrls(promoSlides)
      })
    ]);
  } catch (error) {
    Sentry.captureException(error, {
      level: "warning",
      tags: { feature: "storefront-theme", operation: "sync-media-usages" }
    });
  }
}

function extractSlideUrls(slides: StorefrontSlide[]): string[] {
  return slides.flatMap((slide) => [slide.desktop, slide.mobile, slide.src]).filter((url): url is string => Boolean(url));
}

async function internalizeSlideImages(slides: StorefrontSlide[]): Promise<StorefrontSlide[]> {
  const nextSlides: StorefrontSlide[] = [];

  for (const slide of slides) {
    nextSlides.push({
      ...slide,
      ...(slide.desktop
        ? { desktop: await internalizeExternalMediaUrl(slide.desktop, "STOREFRONT_THEME") }
        : {}),
      ...(slide.mobile
        ? { mobile: await internalizeExternalMediaUrl(slide.mobile, "STOREFRONT_THEME") }
        : {}),
      ...(slide.src
        ? { src: await internalizeExternalMediaUrl(slide.src, "STOREFRONT_THEME") }
        : {})
    });
  }

  return nextSlides;
}

async function saveThemeWithoutFreeShippingThreshold({
  heroSlides,
  name,
  promoSlides,
  textSettings
}: {
  heroSlides: StorefrontSlide[];
  name: string;
  promoSlides: StorefrontSlide[];
  textSettings: typeof defaultThemeText;
}): Promise<void> {
  const { freeShippingThresholdCents: _freeShippingThresholdCents, ...legacyTextSettings } = textSettings;

  Sentry.captureMessage("StorefrontTheme.freeShippingThresholdCents column is missing during theme save.", {
    level: "warning",
    tags: { feature: "storefront-theme", operation: "legacy-save" }
  });

  await prisma.storefrontTheme.upsert({
    where: { singletonKey: "default" },
    select: { id: true },
    create: {
      heroSlides: toJson(heroSlides),
      name,
      promoSlides: toJson(promoSlides),
      singletonKey: "default",
      ...legacyTextSettings
    },
    update: {
      heroSlides: toJson(heroSlides),
      name,
      promoSlides: toJson(promoSlides),
      ...legacyTextSettings
    }
  });
}

function isMissingFreeShippingColumn(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : null;
  const message = error instanceof Error ? error.message : String(error ?? "");

  return code === "P2022" || message.includes("freeShippingThresholdCents");
}
