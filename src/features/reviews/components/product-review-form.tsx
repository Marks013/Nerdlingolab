"use client";

import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { submitProductReview, type ProductReviewFormState } from "@/actions/product-reviews";
import { SafeImage } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ProductReviewFormProps {
  allowImages: boolean;
  allowVideos: boolean;
  maxImages: number;
  maxVideoSeconds: number;
  maxVideos: number;
  orderItemId: string;
  productTitle: string;
  rewardLabel: string;
}

interface UploadedReviewMedia {
  assetId: string;
  mimeType: string;
  url: string;
}

const initialState: ProductReviewFormState = {
  message: "",
  ok: false
};

export function ProductReviewForm({
  allowImages,
  allowVideos,
  maxImages,
  maxVideoSeconds,
  maxVideos,
  orderItemId,
  productTitle,
  rewardLabel
}: ProductReviewFormProps): React.ReactElement {
  const [state, formAction] = useActionState(submitProductReview, initialState);
  const [rating, setRating] = useState(5);
  const [media, setMedia] = useState<UploadedReviewMedia[]>([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const mediaCounts = useMemo(
    () => ({
      images: media.filter((item) => item.mimeType.startsWith("image/")).length,
      videos: media.filter((item) => item.mimeType.startsWith("video/")).length
    }),
    [media]
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setUploadMessage("");
    setIsUploading(true);

    try {
      const nextMedia = [...media];

      for (const file of files) {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if ((isImage && !allowImages) || (isVideo && !allowVideos)) {
          setUploadMessage("Este tipo de mídia está desativado para avaliações.");
          continue;
        }

        if (isImage && nextMedia.filter((item) => item.mimeType.startsWith("image/")).length >= maxImages) {
          setUploadMessage(`Limite de ${maxImages} imagem(ns) atingido.`);
          continue;
        }

        if (isVideo && nextMedia.filter((item) => item.mimeType.startsWith("video/")).length >= maxVideos) {
          setUploadMessage(`Limite de ${maxVideos} vídeo(s) atingido.`);
          continue;
        }

        if (isVideo) {
          const duration = await getVideoDurationSeconds(file);

          if (duration > maxVideoSeconds) {
            setUploadMessage(`Envie vídeos com até ${maxVideoSeconds} segundo(s).`);
            continue;
          }
        }

        const formData = new FormData();
        formData.set("file", file);
        const response = await fetch("/api/reviews/uploads/media", {
          body: formData,
          method: "POST"
        });
        const payload = (await response.json()) as Partial<UploadedReviewMedia> & { message?: string };

        if (!response.ok || !payload.assetId || !payload.url || !payload.mimeType) {
          setUploadMessage(payload.message ?? "Não foi possível enviar a mídia.");
          continue;
        }

        nextMedia.push({
          assetId: payload.assetId,
          mimeType: payload.mimeType,
          url: payload.url
        });
      }

      setMedia(nextMedia);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form action={formAction} className="mt-4 rounded-lg border bg-background p-4">
      <input name="orderItemId" type="hidden" value={orderItemId} />
      <input name="rating" type="hidden" value={rating} />
      {media.map((item) => (
        <input key={item.assetId} name="assetIds" type="hidden" value={item.assetId} />
      ))}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">Avalie {productTitle}</p>
          <p className="text-sm text-muted-foreground">Avaliações publicadas recebem {rewardLabel}.</p>
        </div>
        <div aria-label="Nota da avaliação" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
              className="rounded-md p-1 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              key={value}
              onClick={() => setRating(value)}
              type="button"
            >
              <Star className={cn("size-5", value <= rating ? "fill-current" : "fill-transparent opacity-45")} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <Input maxLength={90} name="title" placeholder="Título curto da avaliação" />
        <Textarea maxLength={1200} name="body" placeholder="Conte como foi sua experiência com o produto" required />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium shadow-sm transition hover:bg-muted">
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          <span>Adicionar mídia</span>
          <input
            accept={buildAcceptValue(allowImages, allowVideos)}
            className="sr-only"
            disabled={isUploading || (!allowImages && !allowVideos)}
            multiple
            onChange={handleFileChange}
            type="file"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {mediaCounts.images}/{maxImages} imagens · {mediaCounts.videos}/{maxVideos} vídeos
        </p>
      </div>

      {media.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {media.map((item) => (
            <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted" key={item.assetId}>
              {item.mimeType.startsWith("video/") ? (
                <video className="size-full object-cover" muted preload="metadata" src={item.url} />
              ) : (
                <SafeImage alt="" className="object-cover" fill sizes="160px" src={item.url} />
              )}
              <button
                aria-label="Remover mídia"
                className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm"
                onClick={() => setMedia((items) => items.filter((current) => current.assetId !== item.assetId))}
                type="button"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <label className="mt-4 flex gap-2 text-sm text-muted-foreground">
        <input className="mt-1" defaultChecked name="publicConsent" type="checkbox" />
        <span>Autorizo exibir minha avaliação na página do produto se ela for aprovada.</span>
      </label>

      {(uploadMessage || state.message) ? (
        <p className={cn("mt-3 text-sm font-medium", state.ok ? "text-emerald-700" : "text-destructive")}>
          {uploadMessage || state.message}
        </p>
      ) : null}

      <SubmitButton disabled={isUploading || state.ok} />
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }): React.ReactElement {
  const status = useFormStatus();

  return (
    <Button className="mt-4 w-full sm:w-auto" disabled={disabled || status.pending} type="submit">
      {status.pending ? "Enviando..." : "Enviar avaliação"}
    </Button>
  );
}

function buildAcceptValue(allowImages: boolean, allowVideos: boolean): string {
  const types = [];

  if (allowImages) {
    types.push("image/jpeg", "image/png", "image/webp", "image/gif");
  }

  if (allowVideos) {
    types.push("video/mp4", "video/webm", "video/ogg");
  }

  return types.join(",");
}

function getVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(Number.POSITIVE_INFINITY);
    };
    video.src = objectUrl;
  });
}
