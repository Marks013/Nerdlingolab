"use client";

import { Loader2 } from "lucide-react";
import type React from "react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

export function SupplierSubmitButton({
  children,
  className,
  disabled,
  label,
  pendingLabel = "Processando...",
  variant = "outline"
}: {
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  label: string;
  pendingLabel?: string;
  variant?: ButtonProps["variant"];
}): React.ReactElement {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-busy={pending}
      className={className}
      disabled={disabled || pending}
      type="submit"
      variant={variant}
    >
      {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : children}
      <span aria-live="polite">{pending ? pendingLabel : label}</span>
    </Button>
  );
}
