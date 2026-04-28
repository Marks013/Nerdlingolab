"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaLibraryPicker } from "@/features/media/components/media-library-picker";
import { parseFriendlyResponse } from "@/lib/http/friendly-response";

interface ThemeImageFieldProps {
  defaultValue?: string;
  label: string;
  name: string;
}

interface UploadResponse {
  message?: string;
  url?: string;
}

export function ThemeImageField({ defaultValue = "", label, name }: ThemeImageFieldProps): React.ReactElement {
  const [value, setValue] = useState(defaultValue);
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
      body: formData,
      method: "POST"
    });
    const parsedResponse = await parseFriendlyResponse<UploadResponse>(
      response,
      "Não foi possível enviar a imagem do tema."
    );

    setIsUploading(false);
    event.target.value = "";

    if (!parsedResponse.ok || !parsedResponse.payload?.url) {
      setMessage(parsedResponse.message);
      return;
    }

    setValue(parsedResponse.payload.url);
  }

  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium">
      {label}
      <div className="flex min-w-0 gap-2">
        <Input
          className="min-w-0"
          name={name}
          onChange={(event) => setValue(event.target.value)}
          value={value}
        />
        <Button
          aria-label={`Enviar ${label}`}
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          type="button"
          variant="outline"
        >
          <ImagePlus className="h-4 w-4" />
        </Button>
        <input
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
          ref={fileInputRef}
          type="file"
        />
      </div>
      <MediaLibraryPicker onSelect={setValue} />
      {message ? <span className="text-xs text-destructive">{message}</span> : null}
    </label>
  );
}
