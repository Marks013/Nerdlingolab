"use client";

import { Loader2 } from "lucide-react";
import type React from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function RoutineSubmitButton({
  children,
  label
}: {
  children: React.ReactNode;
  label: string;
}): React.ReactElement {
  const status = useFormStatus();

  return (
    <Button
      className="w-full min-w-0 justify-start gap-2 whitespace-normal text-left"
      disabled={status.pending}
      type="submit"
      variant="outline"
    >
      {status.pending ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      {status.pending ? "Processando..." : label}
    </Button>
  );
}
