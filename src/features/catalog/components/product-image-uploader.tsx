"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

    const payload = parsedResponse.payload;

    setImageUrls((currentValue) => [currentValue, payload.url].filter(Boolean).join("\n"));
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
      <MediaLibraryPicker
        onSelect={(url) => setImageUrls((currentValue) => [currentValue, url].filter(Boolean).join("\n"))}
      />
      <label className="grid gap-2 text-sm font-medium">
        {label}
        <Textarea
          name="imageUrls"
          onChange={(event) => setImageUrls(event.target.value)}
          placeholder="URLs de imagens, uma por linha"
          value={imageUrls}
        />
      </label>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
