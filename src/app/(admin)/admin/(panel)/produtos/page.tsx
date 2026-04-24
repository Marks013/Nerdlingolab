import { ProductTable } from "@/features/catalog/components/product-table";
import { requireAdmin } from "@/lib/admin";
import { getAdminProducts } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage(): Promise<React.ReactElement> {
  await requireAdmin();

  const products = await getAdminProducts();

  return (
    <main>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ProductTable products={products} />
      </div>
    </main>
  );
}
