"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { syncMediaUsages } from "@/lib/media/assets";
import { prisma } from "@/lib/prisma";
import { normalizeLocalOrHttpUrl } from "@/lib/urls";

const popupSchema = z.object({
  audience: z.string().trim().max(40).default("ALL"),
  ctaHref: z.string().trim().max(240).optional(),
  ctaLabel: z.string().trim().max(40).optional(),
  description: z.string().trim().min(10).max(360),
  endsAt: z.string().trim().optional(),
  eyebrow: z.string().trim().max(50).optional(),
  frequencyHours: z.coerce.number().int().min(1).max(720),
  id: z.string().trim().optional(),
  imageUrl: z.string().trim().max(500).optional(),
  isActive: z.boolean(),
  placement: z.string().trim().max(40).default("GLOBAL"),
  priority: z.coerce.number().int().min(0).max(100),
  startsAt: z.string().trim().optional(),
  themeTone: z.string().trim().max(40).default("ORANGE"),
  title: z.string().trim().min(3).max(90),
  triggerType: z.string().trim().max(40).default("DELAY"),
  triggerValue: z.coerce.number().int().min(0).max(120_000)
});

const templateSchema = z.object({
  body: z.string().trim().min(10).max(2000),
  cooldownHours: z.coerce.number().int().min(1).max(720),
  ctaHref: z.string().trim().max(240).optional(),
  ctaLabel: z.string().trim().max(40).optional(),
  id: z.string().trim().min(1),
  isActive: z.boolean(),
  previewText: z.string().trim().max(180).optional(),
  subject: z.string().trim().min(3).max(140)
});

export async function saveMarketingPopup(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = popupSchema.safeParse({
    audience: formData.get("audience") || "ALL",
    ctaHref: formData.get("ctaHref") || undefined,
    ctaLabel: formData.get("ctaLabel") || undefined,
    description: formData.get("description"),
    endsAt: formData.get("endsAt") || undefined,
    eyebrow: formData.get("eyebrow") || undefined,
    frequencyHours: formData.get("frequencyHours"),
    id: formData.get("id") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
    isActive: formData.get("isActive") === "on",
    placement: formData.get("placement") || "GLOBAL",
    priority: formData.get("priority"),
    startsAt: formData.get("startsAt") || undefined,
    themeTone: formData.get("themeTone") || "ORANGE",
    title: formData.get("title"),
    triggerType: formData.get("triggerType") || "DELAY",
    triggerValue: formData.get("triggerValue")
  });

  if (!parsed.success) {
    throw new Error("Revise os dados do popup.");
  }

  const data = {
    audience: parsed.data.audience,
    ctaHref: normalizeLocalOrHttpUrl(parsed.data.ctaHref) ?? null,
    ctaLabel: emptyToNull(parsed.data.ctaLabel),
    description: parsed.data.description,
    endsAt: parseDateTime(parsed.data.endsAt),
    eyebrow: emptyToNull(parsed.data.eyebrow),
    frequencyHours: parsed.data.frequencyHours,
    imageUrl: normalizeLocalOrHttpUrl(parsed.data.imageUrl) ?? null,
    isActive: parsed.data.isActive,
    placement: parsed.data.placement,
    priority: parsed.data.priority,
    startsAt: parseDateTime(parsed.data.startsAt),
    themeTone: parsed.data.themeTone,
    title: parsed.data.title,
    triggerType: parsed.data.triggerType,
    triggerValue: parsed.data.triggerValue
  };

  try {
    if (parsed.data.id) {
      const popup = await prisma.marketingPopup.update({
        where: { id: parsed.data.id },
        data
      });
      await syncPopupMediaUsage(popup.id, popup.imageUrl);
    } else {
      const popup = await prisma.marketingPopup.create({ data });
      await syncPopupMediaUsage(popup.id, popup.imageUrl);
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "engagement", operation: "save-popup" } });
    throw new Error("Não foi possível salvar o popup.");
  }

  revalidatePath("/");
  revalidatePath("/admin/engajamento");
}

async function syncPopupMediaUsage(popupId: string, imageUrl: string | null): Promise<void> {
  await syncMediaUsages({
    fieldName: "imageUrl",
    ownerId: popupId,
    ownerType: "MARKETING_POPUP",
    urls: imageUrl ? [imageUrl] : []
  });
}

export async function deleteMarketingPopup(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().min(1).parse(formData.get("id"));

  await prisma.marketingPopup.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin/engajamento");
}

export async function saveNotificationTemplate(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = templateSchema.safeParse({
    body: formData.get("body"),
    cooldownHours: formData.get("cooldownHours"),
    ctaHref: formData.get("ctaHref") || undefined,
    ctaLabel: formData.get("ctaLabel") || undefined,
    id: formData.get("id"),
    isActive: formData.get("isActive") === "on",
    previewText: formData.get("previewText") || undefined,
    subject: formData.get("subject")
  });

  if (!parsed.success) {
    throw new Error("Revise o template de alerta.");
  }

  try {
    await prisma.notificationTemplate.update({
      where: { id: parsed.data.id },
      data: {
        body: parsed.data.body,
        cooldownHours: parsed.data.cooldownHours,
        ctaHref: normalizeLocalOrHttpUrl(parsed.data.ctaHref) ?? null,
        ctaLabel: emptyToNull(parsed.data.ctaLabel),
        isActive: parsed.data.isActive,
        previewText: emptyToNull(parsed.data.previewText),
        subject: parsed.data.subject
      }
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "engagement", operation: "save-template" } });
    throw new Error("Não foi possível salvar o template.");
  }

  revalidatePath("/admin/engajamento");
}

function emptyToNull(value?: string): string | null {
  const text = value?.trim() ?? "";
  return text.length > 0 ? text : null;
}

function parseDateTime(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
