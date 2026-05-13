import { notFound } from "next/navigation";

import { restockProductVariant, updateProduct } from "@/actions/catalog";
import { ProductForm } from "@/features/catalog/components/product-form";
import { requireAdmin } from "@/lib/admin";
import { getAdminCategories, getAdminProductById, getAdminProductShippingPresets } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EditProductPage({
  params,
  searchParams
}: EditProductPageProps): Promise<React.ReactElement> {
  await requireAdmin();

  const { id } = await params;
  const [categories, product, shippingPresets] = await Promise.all([
    getAdminCategories(),
    getAdminProductById(id),
    getAdminProductShippingPresets()
  ]);

  if (!product) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const notice = readParam(resolvedSearchParams.notice);
  const formError = readParam(resolvedSearchParams.formError);

  return (
    <main>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProductForm
          action={updateProduct.bind(null, product.id)}
          categories={categories}
          errorNotice={formError}
          notice={notice}
          product={product}
          restockAction={restockProductVariant}
          shippingPresets={shippingPresets}
        />
      </div>
    </main>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  const trimmed = text?.trim();

  return trimmed || undefined;
}
