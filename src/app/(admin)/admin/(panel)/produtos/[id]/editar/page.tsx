import { notFound } from "next/navigation";

import { updateProduct } from "@/actions/catalog";
import { ProductForm } from "@/features/catalog/components/product-form";
import { requireAdmin } from "@/lib/admin";
import { getAdminCategories, getAdminProductById } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({
  params
}: EditProductPageProps): Promise<React.ReactElement> {
  await requireAdmin();

  const { id } = await params;
  const [categories, product] = await Promise.all([
    getAdminCategories(),
    getAdminProductById(id)
  ]);

  if (!product) {
    notFound();
  }

  return (
    <main>
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <ProductForm action={updateProduct.bind(null, product.id)} categories={categories} product={product} />
      </div>
    </main>
  );
}
