"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface CouponCopyButtonProps {
  code: string;
  className?: string;
}

export function CouponCopyButton({ className, code }: CouponCopyButtonProps): React.ReactElement {
  const [copied, setCopied] = useState(false);

  async function copyCode(): Promise<void> {
    await copyText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button className={className} onClick={() => void copyCode()} type="button" variant="outline">
      {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
      {copied ? "Código copiado" : "Copiar código"}
    </Button>
  );
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
