"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { deleteMediaAsset } from "@/lib/media/assets";

export async function deleteMediaAssetAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const assetId = z.string().min(1).parse(formData.get("assetId"));

  await deleteMediaAsset(assetId);
  revalidatePath("/admin/midias");
}

export async function bulkDeleteMediaAssetsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const assetIds = z.array(z.string().min(1)).parse(formData.getAll("assetIds"));

  for (const assetId of assetIds) {
    await deleteMediaAsset(assetId);
  }

  revalidatePath("/admin/midias");
}
