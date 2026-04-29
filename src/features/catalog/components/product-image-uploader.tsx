"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { SafeImage as Image } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import { MediaLibraryPicker } from "@/features/media/components/media-library-picker";
import { parseFriendlyResponse } from "@/lib/http/friendly-response";

interface ProductImageUploaderProps {
  defaultValue?: string;
  label?: string;
}

interface UploadResponse {
  url?: string;
  message?: string;
}

export function ProductImageUploader({
  defaultValue = "",
  label = "Imagens"
}: ProductImageUploaderProps): React.ReactElement {
  const [imageUrls, setImageUrls] = useState(defaultValue);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parsedImageUrls = parseImageUrls(imageUrls);

  function addImageUrl(url: string): void {
    setImageUrls((currentValue) => mergeImageUrls(parseImageUrls(currentValue), url).join("\n"));
  }

  function removeImageUrl(url: string): void {
    setImageUrls((currentValue) => parseImageUrls(currentValue).filter((imageUrl) => imageUrl !== url).join("\n"));
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/uploads/product-image", {
      method: "POST",
      body: formData
    });
    const parsedResponse = await parseFriendlyResponse<UploadResponse>(
      response,
      "Não foi possível enviar a imagem. Tente novamente."
    );

    setIsUploading(false);

    if (!parsedResponse.ok || !parsedResponse.payload?.url) {
      setMessage(parsedResponse.message);
      return;
    }

    addImageUrl(parsedResponse.payload.url);
    event.target.value = "";
  }

  return (
    <div className="space-y-3 lg:col-span-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => fileInputRef.current?.click()}
          type="button"
          variant="outline"
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          {isUploading ? "Enviando..." : "Enviar imagem"}
        </Button>
        <input
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
          ref={fileInputRef}
          type="file"
        />
      </div>
      <MediaLibraryPicker onSelect={addImageUrl} />
      <p className="text-xs text-muted-foreground">
        JPG, JPEG, PNG, GIF e WebP são aceitos; o envio é salvo automaticamente em WebP otimizado.
      </p>
      <input name="imageUrls" readOnly type="hidden" value={imageUrls} />
      <div className="grid gap-2">
        <p className="text-sm font-medium">{label}</p>
        {parsedImageUrls.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {parsedImageUrls.map((url, index) => (
              <figure className="overflow-hidden rounded-lg border bg-background" key={url}>
                <div className="relative aspect-square bg-muted">
                  <Image
                    alt={`Imagem ${index + 1} do produto`}
                    className="object-cover"
                    fill
                    sizes="(min-width: 1024px) 220px, 50vw"
                    src={url}
                  />
                </div>
                <figcaption className="flex items-center justify-between gap-2 p-2 text-xs text-muted-foreground">
                  <span className="truncate">{index === 0 ? "Imagem principal" : `Imagem ${index + 1}`}</span>
                  <Button
                    aria-label={`Remover imagem ${index + 1}`}
                    className="h-8 border-destructive px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeImageUrl(url)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Nenhuma imagem selecionada.
          </div>
        )}
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function parseImageUrls(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function mergeImageUrls(currentUrls: string[], nextUrl: string): string[] {
  const trimmedUrl = nextUrl.trim();

  if (!trimmedUrl || currentUrls.includes(trimmedUrl)) {
    return currentUrls;
  }

  return [...currentUrls, trimmedUrl];
}
