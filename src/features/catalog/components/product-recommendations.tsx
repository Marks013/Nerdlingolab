import { ProductCard } from "@/features/catalog/components/product-card";
import type { ProductListItem } from "@/lib/catalog/queries";

interface ProductRecommendationsProps {
  products: ProductListItem[];
}

export function ProductRecommendations({
  products
}: ProductRecommendationsProps): React.ReactElement | null {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="lg:col-span-2" aria-label="Produtos recomendados">
      <div className="mb-5">
        <p className="text-sm font-medium text-primary">Continue explorando</p>
        <h2 className="mt-2 text-2xl font-bold tracking-normal">Produtos recomendados</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Sugestões ativas da loja, sempre com estoque conferido antes do carrinho.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product, productIndex) => (
          <ProductCard imagePriority={productIndex < 4} key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
