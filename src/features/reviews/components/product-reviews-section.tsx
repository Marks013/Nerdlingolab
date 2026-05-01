import { Star } from "lucide-react";

import { SafeImage } from "@/components/media/safe-image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { PublishedProductReview, ProductReviewSummary } from "@/lib/reviews/queries";
import { cn } from "@/lib/utils";

interface ProductReviewsSectionProps {
  reviews: PublishedProductReview[];
  summary: ProductReviewSummary;
}

export function ProductReviewsSection({ reviews, summary }: ProductReviewsSectionProps): React.ReactElement | null {
  if (summary.count === 0) {
    return null;
  }

  return (
    <section className="mt-8" id="avaliacoes">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Avaliações dos clientes</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.count} avaliação(ões) publicadas neste produto.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2">
              <Star className="size-5 fill-primary text-primary" />
              <span className="font-bold tabular-nums">{summary.averageRating.toFixed(1)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {reviews.map((review) => (
            <article className="rounded-lg border p-4" key={review.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{review.title ?? "Avaliação do produto"}</p>
                  <p className="text-sm text-muted-foreground">
                    {getDisplayName(review.user.name, review.user.email)} · {formatDateTime(review.publishedAt)}
                  </p>
                </div>
                <div aria-label={`${review.rating} de 5 estrelas`} className="flex text-primary">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      className={cn("size-4", value <= review.rating ? "fill-current" : "fill-transparent opacity-40")}
                      key={value}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground">{review.body}</p>
              {review.media.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {review.media.map((item) => (
                    <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted" key={item.id}>
                      {item.mediaType === "VIDEO" ? (
                        <video className="size-full object-cover" controls preload="metadata" src={item.asset.url} />
                      ) : (
                        <SafeImage alt={review.title ?? "Mídia da avaliação"} className="object-cover" fill sizes="220px" src={item.asset.url} />
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function getDisplayName(name: string | null, email: string): string {
  if (name?.trim()) {
    return name.trim();
  }

  return email.split("@")[0] ?? "Cliente";
}
