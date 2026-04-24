import { CategoryManager } from "@/features/catalog/components/category-manager";
import { requireAdmin } from "@/lib/admin";
import { getAdminCategories } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage(): Promise<React.ReactElement> {
  await requireAdmin();

  const categories = await getAdminCategories();

  return (
    <main>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <CategoryManager categories={categories} />
      </div>
    </main>
  );
}
