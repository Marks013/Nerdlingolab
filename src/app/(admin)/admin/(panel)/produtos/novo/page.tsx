import { createProduct } from "@/actions/catalog";
import { ProductForm } from "@/features/catalog/components/product-form";
import { requireAdmin } from "@/lib/admin";
import { getAdminCategories } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export default async function NewProductPage(): Promise<React.ReactElement> {
  await requireAdmin();

  const categories = await getAdminCategories();

  return (
    <main>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProductForm action={createProduct} categories={categories} />
      </div>
    </main>
  );
}
