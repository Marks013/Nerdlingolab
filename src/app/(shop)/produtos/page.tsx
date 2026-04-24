import { ProductCard } from "@/features/catalog/components/product-card";
import { ShopTrustStrip } from "@/components/shop/shop-trust-strip";
import { getPublicProducts } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export default async function ProductsPage(): Promise<React.ReactElement> {
  const products = await getPublicProducts();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Produtos</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Produtos disponíveis para compra, com novidades e seleções especiais da NerdLingoLab.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {products.length === 0 ? (
        <p className="rounded-md border p-6 text-sm text-muted-foreground">
          Nenhum produto ativo no momento.
        </p>
      ) : null}
      <div className="mt-10">
        <ShopTrustStrip />
      </div>
    </main>
  );
}
