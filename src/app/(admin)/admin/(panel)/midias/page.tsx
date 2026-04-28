import { deleteMediaAssetAction } from "@/actions/media";
import { SafeImage as Image } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductImageUploader } from "@/features/catalog/components/product-image-uploader";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage(): Promise<React.ReactElement> {
  const assets = await prisma.mediaAsset.findMany({
    include: {
      usages: {
        select: {
          fieldName: true,
          ownerType: true,
          product: { select: { title: true } }
        },
        take: 6
      }
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    where: { deletedAt: null }
  });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm text-muted-foreground">Biblioteca central</p>
        <h1 className="text-3xl font-bold tracking-normal">Mídias</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Envie, copie e remova imagens usadas em produtos, slides, popups e templates.
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Enviar imagem</CardTitle>
          <CardDescription>O upload já salva a imagem no storage interno do site.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductImageUploader label="Upload para biblioteca" />
        </CardContent>
      </Card>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {assets.map((asset) => (
          <Card key={asset.id}>
            <CardContent className="p-4">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                <Image
                  alt={asset.altText ?? asset.fileName}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1280px) 280px, 50vw"
                  src={asset.url}
                />
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                <strong className="truncate text-sm text-foreground">{asset.fileName}</strong>
                <code className="overflow-x-auto rounded bg-muted px-2 py-1">{asset.url}</code>
                <span>{asset.mimeType} · {Math.round(asset.sizeBytes / 1024)} KB</span>
                <span>{formatDateTime(asset.createdAt)}</span>
                {asset.usages.length > 0 ? (
                  <span>
                    Em uso: {asset.usages.map((usage) => usage.product?.title ?? `${usage.ownerType}/${usage.fieldName}`).join(", ")}
                  </span>
                ) : (
                  <span>Sem vínculos ativos</span>
                )}
              </div>
              <form action={deleteMediaAssetAction} className="mt-3">
                <input name="assetId" type="hidden" value={asset.id} />
                <Button disabled={asset.usages.length > 0} size="sm" type="submit" variant="outline">
                  Excluir
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
