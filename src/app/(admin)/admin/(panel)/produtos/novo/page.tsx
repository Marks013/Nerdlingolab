import { createProduct } from "@/actions/catalog";
import { ProductForm } from "@/features/catalog/components/product-form";
import { requireAdmin } from "@/lib/admin";
import { getAdminCategories, getAdminProductShippingPresets } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

interface NewProductPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewProductPage({
  searchParams
}: NewProductPageProps): Promise<React.ReactElement> {
  await requireAdmin();

  const [categories, shippingPresets] = await Promise.all([
    getAdminCategories(),
    getAdminProductShippingPresets()
  ]);
  const resolvedSearchParams = await searchParams;
  const formError = readParam(resolvedSearchParams.formError);

  return (
    <main>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProductForm action={createProduct} categories={categories} errorNotice={formError} shippingPresets={shippingPresets} />
      </div>
    </main>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  const trimmed = text?.trim();

  return trimmed || undefined;
}
