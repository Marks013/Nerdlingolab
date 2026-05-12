import { SupplierProvider, SupplierSourceStatus } from "@/generated/prisma/client";

export interface SupplierVariantSnapshot {
  externalVariantId: string;
  title: string;
  optionValues: Record<string, string>;
  priceCents: number | null;
  currency: string | null;
  stockQuantity: number | null;
  imageUrl?: string | null;
  status: SupplierSourceStatus;
}

export interface SupplierProductSnapshot {
  provider: SupplierProvider;
  externalId: string | null;
  externalShopId?: string | null;
  title: string | null;
  status: SupplierSourceStatus;
  priceCents: number | null;
  currency: string | null;
  stockQuantity: number | null;
  variants: SupplierVariantSnapshot[];
  rawSummary: Record<string, unknown>;
  fetchedAt: Date;
}

export interface ParsedSupplierUrl {
  provider: SupplierProvider;
  externalId: string | null;
  externalShopId?: string | null;
}

export class SupplierSyncError extends Error {
  constructor(
    message: string,
    public readonly status: SupplierSourceStatus = SupplierSourceStatus.ERROR
  ) {
    super(message);
    this.name = "SupplierSyncError";
  }
}

