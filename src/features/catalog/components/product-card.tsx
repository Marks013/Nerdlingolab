import Link from "next/link";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPrimaryImageUrl } from "@/features/catalog/image-utils";
import { formatCurrency } from "@/lib/format";
import type { ProductListItem } from "@/lib/catalog/queries";

interface ProductCardProps {
  product: ProductListItem;
}

export function ProductCard({ product }: ProductCardProps): React.ReactElement {
  const imageUrl = getPrimaryImageUrl(product.images);

  return (
    <Link className="group" href={`/produtos/${product.slug}`}>
      <Card className="h-full overflow-hidden transition-colors hover:border-primary/60">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageUrl ? (
            <Image
              alt={`Imagem de ${product.title}`}
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              src={imageUrl}
            />
          ) : null}
        </div>
        <CardHeader>
          <p className="text-sm text-muted-foreground">{product.category?.name ?? "NerdLingoLab"}</p>
          <CardTitle className="line-clamp-2 text-base">{product.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-semibold text-primary">{formatCurrency(product.priceCents)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
