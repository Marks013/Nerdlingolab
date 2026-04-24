import { notFound } from "next/navigation";
import Image from "next/image";

import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { getImageUrls, getPrimaryImageUrl } from "@/features/catalog/image-utils";
import { ShippingEstimator } from "@/features/shipping/components/shipping-estimator";
import { formatCurrency } from "@/lib/format";
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
  const variant = product.variants[0];

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
        <p className="mt-4 text-2xl font-semibold text-primary">{formatCurrency(product.priceCents)}</p>
        {product.shortDescription ? (
          <p className="mt-4 text-muted-foreground">{product.shortDescription}</p>
        ) : null}
        <div className="mt-6 whitespace-pre-line text-sm leading-7 text-muted-foreground">
          {product.description}
        </div>
        {variant ? (
          <AddToCartButton
            availableStock={variant.stockQuantity - variant.reservedQuantity}
            item={{
              productId: product.id,
              variantId: variant.id,
              slug: product.slug,
              title: product.title,
              variantTitle: variant.title,
              imageUrl: primaryImage,
              unitPriceCents: variant.priceCents,
              quantity: 1
            }}
          />
        ) : null}
        <ShippingEstimator subtotalCents={variant?.priceCents ?? product.priceCents} />
      </section>
    </main>
  );
}
