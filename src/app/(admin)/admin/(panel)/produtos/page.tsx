import { ProductStatus } from "@/generated/prisma/client";

import { ProductTable } from "@/features/catalog/components/product-table";
import { requireAdmin } from "@/lib/admin";
import { getAdminCategories, getAdminProducts, type AdminProductFilters } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  await requireAdmin();

  const resolvedSearchParams = await searchParams;
  const filters = resolveAdminProductFilters(resolvedSearchParams);
  const [categories, products] = await Promise.all([
    getAdminCategories(),
    getAdminProducts(filters)
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Catálogo</p>
        <h1 className="text-3xl font-bold tracking-normal">Produtos</h1>
      </div>
      <ProductTable categories={categories} filters={filters} products={products} />
    </main>
  );
}

function resolveAdminProductFilters(
  searchParams: Record<string, string | string[] | undefined>
): AdminProductFilters {
  const status = readSearchParam(searchParams.status);

  return {
    categoryId: readSearchParam(searchParams.categoria),
    query: readSearchParam(searchParams.busca),
    status: isProductStatus(status) ? status : undefined
  };
}

function readSearchParam(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  const trimmed = text?.trim();

  return trimmed ? trimmed : undefined;
}

function isProductStatus(value: string | undefined): value is ProductStatus {
  return value === ProductStatus.ACTIVE || value === ProductStatus.DRAFT || value === ProductStatus.ARCHIVED;
}
