"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { parseFriendlyResponse } from "@/lib/http/friendly-response";

interface MediaUploadButtonProps {
  accept?: "all" | "image" | "video";
  label?: string;
  onUploaded?: (url: string) => void;
}

interface UploadResponse {
  url?: string;
}

export function MediaUploadButton({
  accept = "all",
  label = "Enviar midia",
  onUploaded
}: MediaUploadButtonProps): React.ReactElement {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/uploads/media", {
      body: formData,
      method: "POST"
    });
    const parsedResponse = await parseFriendlyResponse<UploadResponse>(response, "Nao foi possivel enviar a midia.");

    setIsUploading(false);
    event.target.value = "";

    if (!parsedResponse.ok || !parsedResponse.payload?.url) {
      setMessage(parsedResponse.message);
      return;
    }

    setMessage("Midia enviada com sucesso.");
    onUploaded?.(parsedResponse.payload.url);
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <Button onClick={() => inputRef.current?.click()} type="button" variant="outline">
        <UploadCloud className="mr-2 h-4 w-4" />
        {isUploading ? "Enviando..." : label}
      </Button>
      <input
        accept={getAcceptValue(accept)}
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
        ref={inputRef}
        type="file"
      />
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function getAcceptValue(accept: "all" | "image" | "video"): string {
  if (accept === "image") {
    return "image/jpeg,image/png,image/webp,image/gif";
  }

  if (accept === "video") {
    return "video/mp4,video/webm,video/ogg";
  }

  return "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/ogg";
}
