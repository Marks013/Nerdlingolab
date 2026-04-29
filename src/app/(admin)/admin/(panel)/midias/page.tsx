import { ExternalLink, ImageIcon, Search, ShieldAlert, Trash2, UploadCloud, Video } from "lucide-react";
import Link from "next/link";

import { bulkDeleteMediaAssetsAction, deleteMediaAssetAction } from "@/actions/media";
import { SafeImage as Image } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaUploadButton } from "@/features/media/components/media-upload-button";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface AdminMediaPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminMediaPage({ searchParams }: AdminMediaPageProps): Promise<React.ReactElement> {
  const resolvedSearchParams = await searchParams;
  const filters = resolveMediaFilters(resolvedSearchParams);
  const [assets, totalAssets, totalSize] = await Promise.all([
    getMediaAssets(filters),
    prisma.mediaAsset.count({ where: { deletedAt: null } }),
    prisma.mediaAsset.aggregate({
      _sum: { sizeBytes: true },
      where: { deletedAt: null }
    })
  ]);
  const usedAssets = assets.filter((asset) => asset.usages.length > 0).length;
  const unusedAssets = assets.length - usedAssets;
  const deletableAssetIds = assets.filter((asset) => asset.usages.length === 0).map((asset) => asset.id);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6">
        <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Biblioteca central</p>
            <h1 className="text-3xl font-bold tracking-normal">Midias</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Envie, encontre, copie e remova arquivos com visibilidade de uso em produtos e outros modulos.
            </p>
          </div>
          <form action={bulkDeleteMediaAssetsAction}>
            {deletableAssetIds.map((assetId) => (
              <input key={assetId} name="assetIds" type="hidden" value={assetId} />
            ))}
            <Button disabled={deletableAssetIds.length === 0} type="submit" variant="outline">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir nao usadas
            </Button>
          </form>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric title="Arquivos" value={String(totalAssets)} />
          <Metric title="Listados" value={String(assets.length)} />
          <Metric title="Em uso" value={String(usedAssets)} />
          <Metric title="Armazenamento" value={formatBytes(totalSize._sum.sizeBytes ?? 0)} />
        </div>

        <section className="rounded-lg border bg-background p-5">
          <div className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold tracking-normal">Enviar midia</h2>
          </div>
          <div className="mt-4 grid gap-2">
            <MediaUploadButton accept="all" label="Enviar imagem ou video" />
            <p className="text-xs text-muted-foreground">
              Imagens sao convertidas para WebP. Videos MP4, WebM e OGG ficam centralizados na biblioteca.
            </p>
          </div>
        </section>

        <form className="grid gap-3 rounded-lg border bg-background p-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <label className="grid gap-2 text-sm font-medium">
            Buscar
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" defaultValue={filters.query ?? ""} name="busca" placeholder="Arquivo, URL, produto ou origem" />
            </span>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Uso
            <select className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={filters.usage ?? ""} name="uso">
              <option value="">Todos</option>
              <option value="used">Em uso</option>
              <option value="unused">Nao usadas</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Origem
            <select className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={filters.source ?? ""} name="origem">
              <option value="">Todas</option>
              <option value="UPLOAD">Upload</option>
              <option value="EXTERNAL_IMPORT">Importacao externa</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button className="w-full" type="submit" variant="secondary">Filtrar</Button>
            <Button asChild className="w-full" variant="ghost">
              <Link href="/admin/midias">Limpar</Link>
            </Button>
          </div>
        </form>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {assets.map((asset) => (
            <article className="overflow-hidden rounded-lg border bg-background" key={asset.id}>
              <div className="relative aspect-square bg-muted">
                {asset.mimeType.startsWith("video/") ? (
                  <div className="grid h-full place-items-center text-muted-foreground">
                    <Video className="h-10 w-10" />
                  </div>
                ) : (
                  <Image
                    alt={asset.altText ?? asset.fileName}
                    className="object-cover"
                    fill
                    sizes="(min-width: 1280px) 280px, 50vw"
                    src={asset.url}
                  />
                )}
              </div>
              <div className="grid gap-3 p-4 text-xs text-muted-foreground">
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-foreground">{asset.fileName}</strong>
                  <span>{asset.mimeType} / {formatBytes(asset.sizeBytes)} / {asset.width ?? "-"}x{asset.height ?? "-"}</span>
                </div>
                <code className="overflow-x-auto rounded bg-muted px-2 py-1">{asset.url}</code>
                <div className="grid gap-1">
                  <span>{asset.source} / {formatDateTime(asset.createdAt)}</span>
                  <UsageSummary asset={asset} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={asset.url} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={getMediaProductHref(asset)} title="Ver produto vinculado">
                      <Search className="h-4 w-4" />
                    </Link>
                  </Button>
                  <form action={deleteMediaAssetAction}>
                    <input name="assetId" type="hidden" value={asset.id} />
                    <Button
                      className="w-full border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={asset.usages.length > 0}
                      size="sm"
                      title={asset.usages.length > 0 ? "Remova os vinculos antes de excluir" : "Excluir arquivo"}
                      type="submit"
                      variant="outline"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </div>
            </article>
          ))}
          {assets.length === 0 ? (
            <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground sm:col-span-2 xl:col-span-4">
              Nenhuma midia encontrada para os filtros atuais.
            </div>
          ) : null}
        </section>

        {unusedAssets > 0 ? (
          <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            <ShieldAlert className="mr-2 inline h-4 w-4" />
            Arquivos sem vinculo podem ser excluidos. Arquivos em uso ficam protegidos para evitar quebrar produtos, tema e campanhas.
          </div>
        ) : null}
      </div>
    </main>
  );
}

type MediaAssetWithUsages = Awaited<ReturnType<typeof getMediaAssets>>[number];

async function getMediaAssets(filters: MediaFilters) {
  return prisma.mediaAsset.findMany({
    include: {
      usages: {
        orderBy: { sortOrder: "asc" },
        select: {
          fieldName: true,
          ownerType: true,
          product: { select: { id: true, title: true } }
        },
        take: 8
      }
    },
    orderBy: { createdAt: "desc" },
    take: 120,
    where: {
      deletedAt: null,
      source: filters.source,
      ...(filters.usage === "used" ? { usages: { some: {} } } : {}),
      ...(filters.usage === "unused" ? { usages: { none: {} } } : {}),
      ...(filters.query
        ? {
            OR: [
              { fileName: { contains: filters.query, mode: "insensitive" } },
              { objectKey: { contains: filters.query, mode: "insensitive" } },
              { originalUrl: { contains: filters.query, mode: "insensitive" } },
              { source: { contains: filters.query, mode: "insensitive" } },
              { url: { contains: filters.query, mode: "insensitive" } },
              { usages: { some: { product: { title: { contains: filters.query, mode: "insensitive" } } } } }
            ]
          }
        : {})
    }
  });
}

function UsageSummary({ asset }: { asset: MediaAssetWithUsages }): React.ReactElement {
  if (asset.usages.length === 0) {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full border px-2 py-1 text-xs">
        <ImageIcon className="h-3.5 w-3.5" />
        Sem vinculos ativos
      </span>
    );
  }

  return (
    <div className="grid gap-1">
      <span className="inline-flex w-fit items-center rounded-full border px-2 py-1 text-xs">
        Em uso em {asset.usages.length} local{asset.usages.length === 1 ? "" : "is"}
      </span>
      <span className="line-clamp-2">
        {asset.usages.map((usage) => usage.product?.title ?? `${usage.ownerType}/${usage.fieldName}`).join(", ")}
      </span>
    </div>
  );
}

function getMediaProductHref(asset: MediaAssetWithUsages): string {
  const productUsage = asset.usages.find((usage) => usage.product?.id);

  if (productUsage?.product?.id) {
    return `/admin/produtos/${productUsage.product.id}/editar`;
  }

  return `/admin/produtos?busca=${encodeURIComponent(asset.url)}`;
}

function Metric({ title, value }: { title: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-normal">{value}</p>
    </div>
  );
}

interface MediaFilters {
  query?: string;
  source?: string;
  usage?: "used" | "unused";
}

function resolveMediaFilters(searchParams: Record<string, string | string[] | undefined>): MediaFilters {
  const usage = readSearchParam(searchParams.uso);

  return {
    query: readSearchParam(searchParams.busca),
    source: readSearchParam(searchParams.origem),
    usage: usage === "used" || usage === "unused" ? usage : undefined
  };
}

function readSearchParam(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  const trimmed = text?.trim();

  return trimmed ? trimmed : undefined;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
