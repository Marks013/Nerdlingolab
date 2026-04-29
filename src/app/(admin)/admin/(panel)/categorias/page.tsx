import { CategoryManager } from "@/features/catalog/components/category-manager";
import { requireAdmin } from "@/lib/admin";
import { getAdminCategoryManagerData, getAdminProducts } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage(): Promise<React.ReactElement> {
  await requireAdmin();

  const [categories, products] = await Promise.all([
    getAdminCategoryManagerData(),
    getAdminProducts()
  ]);

  return (
    <main>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CategoryManager categories={categories} products={products} />
      </div>
    </main>
  );
}
