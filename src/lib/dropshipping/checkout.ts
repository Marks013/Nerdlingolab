import { SupplierSourceStatus } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

const blockingStatuses = new Set<SupplierSourceStatus>([
  SupplierSourceStatus.PAUSED,
  SupplierSourceStatus.CLOSED,
  SupplierSourceStatus.DELETED,
  SupplierSourceStatus.OUT_OF_STOCK
]);

export async function assertDropshippingCheckoutAvailability(
  items: Array<{ productId: string; variantId?: string | null; title: string }>
): Promise<void> {
  if (process.env.DROPSHIPPING_CHECKOUT_STRICT !== "true") {
    return;
  }

  const productIds = [...new Set(items.map((item) => item.productId))];

  if (!productIds.length) {
    return;
  }

  const sources = await prisma.productSource.findMany({
    include: {
      variants: true
    },
    where: {
      productId: { in: productIds },
      syncEnabled: true
    }
  });

  for (const item of items) {
    const source = sources.find((candidate) => candidate.productId === item.productId);

    if (!source) {
      continue;
    }

    if (blockingStatuses.has(source.status)) {
      throw new Error(`Produto indisponivel no fornecedor: ${item.title}.`);
    }

    if (item.variantId) {
      const sourceVariant = source.variants.find((variant) => variant.variantId === item.variantId);

      if (sourceVariant && blockingStatuses.has(sourceVariant.status)) {
        throw new Error(`Variacao indisponivel no fornecedor: ${item.title}.`);
      }
    }
  }
}

