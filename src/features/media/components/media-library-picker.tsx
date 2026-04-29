"use client";

import { Images, Video } from "lucide-react";
import { useState } from "react";

import { SafeImage as Image } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import { parseFriendlyResponse } from "@/lib/http/friendly-response";

interface MediaAssetOption {
  altText: string | null;
  fileName: string;
  id: string;
  mimeType: string;
  url: string;
}

interface MediaLibraryPickerProps {
  accept?: "all" | "image" | "video";
  buttonLabel?: string;
  onSelect: (url: string, asset?: MediaAssetOption) => void;
}

interface MediaListResponse {
  assets: MediaAssetOption[];
}

export function MediaLibraryPicker({
  accept = "image",
  buttonLabel = "Escolher da biblioteca",
  onSelect
}: MediaLibraryPickerProps): React.ReactElement {
  const [assets, setAssets] = useState<MediaAssetOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function openLibrary(): Promise<void> {
    setIsOpen((current) => !current);

    if (assets.length > 0 || isLoading) {
      return;
    }

    setIsLoading(true);
    const response = await fetch("/api/admin/media");
    const parsedResponse = await parseFriendlyResponse<MediaListResponse>(
      response,
      "Não foi possível carregar a biblioteca."
    );
    setIsLoading(false);

    if (!parsedResponse.ok || !parsedResponse.payload) {
      setMessage(parsedResponse.message);
      return;
    }

    setAssets(parsedResponse.payload.assets);
  }

  const filteredAssets = assets.filter((asset) => {
    if (accept === "all") {
      return true;
    }

    return asset.mimeType.startsWith(`${accept}/`);
  });

  return (
    <div className="grid gap-3">
      <Button onClick={() => void openLibrary()} type="button" variant="outline">
        <Images className="mr-2 h-4 w-4" />
        {buttonLabel}
      </Button>
      {isOpen ? (
        <div className="grid max-h-[360px] gap-3 overflow-y-auto rounded-lg border bg-background p-3 sm:grid-cols-2 lg:grid-cols-4">
          {filteredAssets.map((asset) => (
            <button
              className="group grid gap-2 rounded-lg border bg-white p-2 text-left transition hover:border-primary"
              key={asset.id}
              onClick={() => onSelect(asset.url, asset)}
              type="button"
            >
              <span className="relative aspect-square overflow-hidden rounded-md bg-muted">
                {asset.mimeType.startsWith("video/") ? (
                  <span className="grid h-full place-items-center text-muted-foreground">
                    <Video className="h-8 w-8" />
                  </span>
                ) : (
                  <Image
                    alt={asset.altText ?? asset.fileName}
                    className="object-cover transition group-hover:scale-105"
                    fill
                    sizes="160px"
                    src={asset.url}
                  />
                )}
              </span>
              <span className="truncate text-xs font-semibold">{asset.fileName}</span>
            </button>
          ))}
          {!isLoading && filteredAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">Nenhuma midia compativel salva ainda.</p>
          ) : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
          {message ? <p className="text-sm text-destructive sm:col-span-2 lg:col-span-4">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
