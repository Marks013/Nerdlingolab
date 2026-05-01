"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { SafeImage as Image } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
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
    <div className="grid min-w-0 gap-2 text-sm font-medium">
      <span>{label}</span>
      <input name={name} type="hidden" value={value} />
      <div className="grid gap-3 rounded-lg border bg-muted/20 p-3">
        <div className="relative aspect-[16/7] overflow-hidden rounded-md bg-muted">
          {value ? (
            <Image alt={label} className="object-cover" fill sizes="360px" src={value} />
          ) : (
            <div className="grid h-full place-items-center px-3 text-center text-xs text-muted-foreground">
              Nenhuma imagem selecionada
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            aria-label={`Enviar ${label}`}
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            type="button"
            variant="outline"
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            {isUploading ? "Enviando" : "Upload"}
          </Button>
          <MediaLibraryPicker buttonLabel="Biblioteca" onSelect={setValue} />
          {value ? (
            <Button onClick={() => setValue("")} type="button" variant="outline">
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar
            </Button>
          ) : null}
        </div>
        <input
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
          ref={fileInputRef}
          type="file"
        />
        {message ? <span className="text-xs text-destructive">{message}</span> : null}
      </div>
    </div>
  );
}
