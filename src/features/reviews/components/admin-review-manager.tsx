import Link from "next/link";
import { CheckCircle2, EyeOff, Image as ImageIcon, Star, Video, XCircle } from "lucide-react";

import {
  hideProductReview,
  publishProductReview,
  rejectProductReview,
  updateProductReviewSettings
} from "@/actions/product-reviews";
import { ProductReviewRewardMode, ProductReviewStatus } from "@/generated/prisma/client";
import { SafeImage } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { AdminProductReview } from "@/lib/reviews/queries";
import { formatReaisInput, formatReviewReward } from "@/lib/reviews/rewards";
import { cn } from "@/lib/utils";

interface AdminReviewManagerProps {
  reviews: AdminProductReview[];
  settings: {
    allowImages: boolean;
    allowVideos: boolean;
    couponExpiresInDays: number;
    couponValueCents: number;
    isEnabled: boolean;
    maxImages: number;
    maxVideoSeconds: number;
    maxVideos: number;
    nerdcoinsRewardPoints: number;
    requireDeliveredOrder: boolean;
    rewardMode: ProductReviewRewardMode;
  };
}

export function AdminReviewManager({ reviews, settings }: AdminReviewManagerProps): React.ReactElement {
  const pendingReviews = reviews.filter((review) => review.status === ProductReviewStatus.PENDING);
  const publishedReviews = reviews.filter((review) => review.status === ProductReviewStatus.PUBLISHED);
  const archivedReviews = reviews.filter(
    (review) => review.status === ProductReviewStatus.REJECTED || review.status === ProductReviewStatus.HIDDEN
  );

  return (
    <div>
      <div>
        <p className="text-sm text-muted-foreground">Moderação e recompensa</p>
        <h1 className="text-3xl font-bold tracking-normal">Avaliações de produtos</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Aprove avaliações reais de compras finalizadas e libere recompensa configurável em cupom ou Nerdcoins.
        </p>
      </div>

      <section className="mt-6 grid gap-3 md:grid-cols-4">
        <Metric label="Pendentes" value={String(pendingReviews.length)} />
        <Metric label="Publicadas" value={String(publishedReviews.length)} />
        <Metric label="Arquivadas" value={String(archivedReviews.length)} />
        <Metric label="Recompensa atual" value={formatReviewReward(settings)} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>O valor do cupom é informado em reais.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProductReviewSettings} className="grid gap-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input defaultChecked={settings.isEnabled} name="isEnabled" type="checkbox" />
                Sistema de avaliações ativo
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input defaultChecked={settings.requireDeliveredOrder} name="requireDeliveredOrder" type="checkbox" />
                Exigir pedido entregue/finalizado
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Recompensa">
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    defaultValue={settings.rewardMode}
                    name="rewardMode"
                  >
                    <option value={ProductReviewRewardMode.COUPON}>Cupom</option>
                    <option value={ProductReviewRewardMode.NERDCOINS}>Nerdcoins</option>
                    <option value={ProductReviewRewardMode.NONE}>Sem recompensa</option>
                  </select>
                </Field>
                <Field label="Valor do cupom (R$)">
                  <Input defaultValue={formatReaisInput(settings.couponValueCents)} inputMode="decimal" name="couponValueReais" />
                </Field>
                <Field label="Validade do cupom (dias)">
                  <Input defaultValue={settings.couponExpiresInDays} min={1} name="couponExpiresInDays" type="number" />
                </Field>
                <Field label="Nerdcoins por avaliação">
                  <Input defaultValue={settings.nerdcoinsRewardPoints} min={0} name="nerdcoinsRewardPoints" type="number" />
                </Field>
              </div>

              <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input defaultChecked={settings.allowImages} name="allowImages" type="checkbox" />
                  Permitir imagens
                </label>
                <Field label="Máx. imagens">
                  <Input defaultValue={settings.maxImages} min={0} name="maxImages" type="number" />
                </Field>
                <Field label="Máx. vídeos">
                  <Input defaultValue={settings.maxVideos} min={0} name="maxVideos" type="number" />
                </Field>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input defaultChecked={settings.allowVideos} name="allowVideos" type="checkbox" />
                  Permitir vídeos
                </label>
                <Field label="Duração do vídeo (s)">
                  <Input defaultValue={settings.maxVideoSeconds} min={5} name="maxVideoSeconds" type="number" />
                </Field>
              </div>

              <Button type="submit">Salvar configurações</Button>
            </form>
          </CardContent>
        </Card>

        <section className="grid gap-6">
          <ReviewGroup emptyLabel="Nenhuma avaliação pendente." reviews={pendingReviews} title="Pendentes" />
          <ReviewGroup emptyLabel="Nenhuma avaliação publicada." reviews={publishedReviews} title="Publicadas" />
          <ReviewGroup emptyLabel="Nenhuma avaliação arquivada." reviews={archivedReviews} title="Recusadas e ocultas" />
        </section>
      </section>
    </div>
  );
}

function ReviewGroup({
  emptyLabel,
  reviews,
  title
}: {
  emptyLabel: string;
  reviews: AdminProductReview[];
  title: string;
}): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{reviews.length} registro(s)</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
        {reviews.length === 0 ? (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReviewCard({ review }: { review: AdminProductReview }): React.ReactElement {
  return (
    <article className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={review.status} />
            <span className="text-sm text-muted-foreground">{formatDateTime(review.createdAt)}</span>
          </div>
          <h3 className="mt-2 font-semibold text-pretty">{review.title ?? review.product.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {review.user.name ?? review.user.email} · pedido{" "}
            <Link className="font-medium text-primary hover:underline" href={`/admin/pedidos/${review.order.id}`}>
              {review.order.orderNumber}
            </Link>
          </p>
          <Link className="mt-1 inline-block text-sm font-medium text-primary hover:underline" href={`/produtos/${review.product.slug}`}>
            Ver produto
          </Link>
        </div>
        <div className="flex text-primary" aria-label={`${review.rating} de 5 estrelas`}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Star className={cn("size-4", value <= review.rating ? "fill-current" : "fill-transparent opacity-40")} key={value} />
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-foreground">{review.body}</p>

      {review.rewardGrantedAt ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          Recompensa liberada em {formatDateTime(review.rewardGrantedAt)}
          {review.rewardCouponId ? ` · cupom ${formatCurrency(review.rewardCoupon?.value ?? 0)}` : ""}
          {review.rewardPoints ? ` · ${review.rewardPoints} Nerdcoins` : ""}
        </p>
      ) : null}

      {review.media.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {review.media.map((item) => (
            <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted" key={item.id}>
              {item.mediaType === "VIDEO" ? (
                <video className="size-full object-cover" controls preload="metadata" src={item.asset.url} />
              ) : (
                <SafeImage alt="" className="object-cover" fill sizes="180px" src={item.asset.url} />
              )}
              <span className="absolute bottom-2 left-2 rounded-full bg-background/95 px-2 py-1 text-xs font-medium shadow-sm">
                {item.mediaType === "VIDEO" ? <Video className="inline size-3" /> : <ImageIcon className="inline size-3" />}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <form action={publishProductReview.bind(null, review.id)} className="grid gap-2 rounded-lg border p-3">
          <Textarea defaultValue={review.adminNotes ?? ""} name="adminNotes" placeholder="Observação interna opcional" />
          <Button disabled={review.status === ProductReviewStatus.PUBLISHED} type="submit">
            <CheckCircle2 className="mr-2 size-4" />
            Aprovar e publicar
          </Button>
        </form>
        <form action={rejectProductReview.bind(null, review.id)} className="grid gap-2 rounded-lg border p-3">
          <Textarea defaultValue={review.rejectionReason ?? ""} name="rejectionReason" placeholder="Motivo da recusa" />
          <Button disabled={review.status === ProductReviewStatus.REJECTED} type="submit" variant="outline">
            <XCircle className="mr-2 size-4" />
            Recusar e limpar mídias
          </Button>
        </form>
      </div>

      {review.status === ProductReviewStatus.PUBLISHED ? (
        <form action={hideProductReview.bind(null, review.id)} className="mt-3">
          <Button size="sm" type="submit" variant="outline">
            <EyeOff className="mr-2 size-4" />
            Ocultar da página
          </Button>
        </form>
      ) : null}
    </article>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }): React.ReactElement {
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ProductReviewStatus }): React.ReactElement {
  const styles: Record<ProductReviewStatus, string> = {
    HIDDEN: "border-slate-200 bg-slate-50 text-slate-700",
    PENDING: "border-orange-200 bg-orange-50 text-orange-800",
    PUBLISHED: "border-emerald-200 bg-emerald-50 text-emerald-800",
    REJECTED: "border-red-200 bg-red-50 text-red-800"
  };
  const labels: Record<ProductReviewStatus, string> = {
    HIDDEN: "Oculta",
    PENDING: "Pendente",
    PUBLISHED: "Publicada",
    REJECTED: "Recusada"
  };

  return (
    <span className={cn("rounded-full border px-2 py-1 text-xs font-bold", styles[status])}>
      {labels[status]}
    </span>
  );
}
