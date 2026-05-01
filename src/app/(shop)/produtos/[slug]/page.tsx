import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailShell } from "@/features/catalog/components/product-detail-shell";
import { ProductRecommendations } from "@/features/catalog/components/product-recommendations";
import { getImageUrls, getPrimaryImageUrl } from "@/features/catalog/image-utils";
import {
  getPublicProductBySlug,
  getPublicProductRecommendations
} from "@/lib/catalog/queries";
import { getProductBadges } from "@/lib/catalog/badges";
import { getStorefrontTheme } from "@/lib/theme/storefront";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) {
    return {
      title: "Produto não encontrado",
      robots: {
        follow: false,
        index: false
      }
    };
  }

  const primaryImage = getPrimaryImageUrl(product.images);
  const description = product.seoDescription ?? product.shortDescription ?? product.description.slice(0, 155);

  return {
    title: product.seoTitle ?? product.title,
    description,
    alternates: {
      canonical: `/produtos/${product.slug}`
    },
    openGraph: {
      description,
      images: primaryImage ? [primaryImage] : undefined,
      title: product.title,
      type: "website"
    }
  };
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
    optionValues: variant.optionValues,
    priceCents: variant.priceCents,
    compareAtPriceCents: variant.compareAtPriceCents,
    heightCm: variant.heightCm,
    lengthCm: variant.lengthCm,
    shippingLeadTimeDays: variant.shippingLeadTimeDays,
    weightGrams: variant.weightGrams,
    widthCm: variant.widthCm,
    availableStock: Math.max(0, variant.stockQuantity - variant.reservedQuantity),
    imageUrl: getVariantImageUrl(variant.optionValues)
  }));
  const recommendedProducts = await getPublicProductRecommendations({
    categoryId: product.categoryId,
    productId: product.id
  });
  const theme = await getStorefrontTheme();
  const productBadges = getProductBadges(product);

  return (
    <main className="geek-page min-h-screen">
      <div className="mx-auto w-full max-w-[1360px] px-5 py-8">
        <nav className="mb-7 text-sm text-[#677279]" aria-label="Breadcrumb">
          <Link href="/">Pagina inicial</Link>
          <span className="mx-2">›</span>
          <Link href="/produtos">Todos os produtos</Link>
          <span className="mx-2">›</span>
          <span>{product.title}</span>
        </nav>

        <ProductDetailShell
          description={product.description}
          images={images}
          primaryImage={primaryImage}
          productId={product.id}
          productBadges={productBadges}
          productSlug={product.slug}
          productTitle={product.title}
          productUrl={`${(process.env.APP_URL ?? "https://nerdlingolab.duckdns.org").replace(/\/$/, "")}/produtos/${product.slug}`}
          freeShippingThresholdCents={theme.freeShippingThresholdCents}
          paymentTerms={{
            cardInstallmentMonthlyRateBps: theme.cardInstallmentMonthlyRateBps,
            maxInstallments: theme.maxInstallments,
            paymentFeeSource: theme.paymentFeeSource,
            pixDiscountBps: theme.pixDiscountBps
          }}
          variants={variants}
        />

        <ProductRecommendations products={recommendedProducts} />
      </div>
    </main>
  );
}

function getVariantImageUrl(optionValues: unknown): string | null {
  if (!optionValues || typeof optionValues !== "object" || Array.isArray(optionValues)) {
    return null;
  }

  const imageUrl = (optionValues as Record<string, unknown>)._imageUrl;

  return typeof imageUrl === "string" && imageUrl.length > 0 ? imageUrl : null;
}
