import { notFound } from "next/navigation";
import Image from "next/image";

import { ShopTrustStrip } from "@/components/shop/shop-trust-strip";
import { getImageUrls, getPrimaryImageUrl } from "@/features/catalog/image-utils";
import { ProductPurchasePanel } from "@/features/catalog/components/product-purchase-panel";
import { getPublicProductBySlug } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const images = getImageUrls(product.images);
  const primaryImage = getPrimaryImageUrl(product.images);
  const variants = product.variants.map((variant) => ({
    id: variant.id,
    title: variant.title,
    priceCents: variant.priceCents,
    compareAtPriceCents: variant.compareAtPriceCents,
    availableStock: Math.max(0, variant.stockQuantity - variant.reservedQuantity)
  }));

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          {primaryImage ? (
            <Image
              alt={`Imagem principal de ${product.title}`}
              className="object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              src={primaryImage}
            />
          ) : null}
        </div>
        {images.length > 1 ? (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {images.slice(1, 5).map((imageUrl, imageIndex) => (
              <div className="relative aspect-square overflow-hidden rounded-lg bg-muted" key={imageUrl}>
                <Image
                  alt={`Imagem ${imageIndex + 2} de ${product.title}`}
                  className="object-cover"
                  fill
                  sizes="25vw"
                  src={imageUrl}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <section className="flex flex-col justify-center">
        <p className="text-sm text-muted-foreground">{product.category?.name ?? "NerdLingoLab"}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">{product.title}</h1>
        {product.shortDescription ? (
          <p className="mt-4 text-muted-foreground">{product.shortDescription}</p>
        ) : null}
        <div className="mt-6 whitespace-pre-line text-sm leading-7 text-muted-foreground">
          {product.description}
        </div>
        <ProductPurchasePanel
          imageUrl={primaryImage}
          productId={product.id}
          productSlug={product.slug}
          productTitle={product.title}
          variants={variants}
        />
        <div className="mt-6">
          <ShopTrustStrip />
        </div>
      </section>
    </main>
  );
}
