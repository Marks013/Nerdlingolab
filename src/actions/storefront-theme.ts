"use server";

import type { Prisma } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin";
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
  const heroSlides = readSlides(formData, "hero", defaultHeroSlides);
  const promoSlides = readSlides(formData, "promo", defaultPromoSlides);

  try {
    await prisma.storefrontTheme.upsert({
      where: { singletonKey: "default" },
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
    Sentry.captureException(error);
    throw new Error("Não foi possível salvar o tema da vitrine.");
  }

  revalidatePath("/");
  revalidatePath("/admin/tema");
}

export async function resetStorefrontTheme(): Promise<void> {
  await requireAdmin();

  try {
    await prisma.storefrontTheme.upsert({
      where: { singletonKey: "default" },
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
    Sentry.captureException(error);
    throw new Error("Não foi possível restaurar o tema padrão.");
  }

  revalidatePath("/");
  revalidatePath("/admin/tema");
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

function toJson(slides: StorefrontSlide[]): Prisma.InputJsonValue {
  return slides.map((slide) => ({
    alt: slide.alt,
    href: slide.href,
    ...(slide.desktop ? { desktop: slide.desktop } : {}),
    ...(slide.mobile ? { mobile: slide.mobile } : {}),
    ...(slide.src ? { src: slide.src } : {})
  })) as Prisma.InputJsonValue;
}
