"use client";

import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { FormEvent, ReactElement, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FormStatus = "idle" | "saved" | "error";

interface AdminFeedbackFormProps {
  action: (formData: FormData) => Promise<void>;
  allowPristineSubmit?: boolean;
  children: ReactNode;
  className?: string;
  errorMessage?: string;
  onSuccessReset?: boolean;
  savedLabel?: string;
  submitLabel: string;
  successMessage?: string;
}

export function AdminFeedbackForm({
  action,
  allowPristineSubmit = false,
  children,
  className,
  errorMessage = "Não foi possível salvar. Revise os dados e tente novamente.",
  onSuccessReset = false,
  savedLabel = "Salvo",
  submitLabel,
  successMessage = "Alterações salvas com sucesso."
}: AdminFeedbackFormProps): ReactElement {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDirty, setIsDirty] = useState(allowPristineSubmit);
  const [resetVersion, setResetVersion] = useState(0);
  const [status, setStatus] = useState<FormStatus>(allowPristineSubmit ? "idle" : "saved");
  const [message, setMessage] = useState<string>(allowPristineSubmit ? "" : "Tudo atualizado.");

  const canSubmit = allowPristineSubmit || isDirty;

  function markDirty(): void {
    setIsDirty(true);
    setStatus("idle");
    setMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!canSubmit || isPending) {
      setStatus("saved");
      setMessage("Nada novo para salvar. As informações já estão atualizadas.");
      return;
    }

    const form = formRef.current;
    if (!form) {
      return;
    }

    const formData = new FormData(form);

    startTransition(() => {
      void action(formData)
        .then(() => {
          setIsDirty(false);
          setStatus("saved");
          setMessage(successMessage);

          if (onSuccessReset) {
            form.reset();
            setResetVersion((current) => current + 1);
            setIsDirty(allowPristineSubmit);
          }

          router.refresh();
        })
        .catch((error: unknown) => {
          setStatus("error");
          setMessage(error instanceof Error && error.message ? error.message : errorMessage);
        });
    });
  }

  return (
    <form
      className={cn("grid gap-3", className)}
      onChange={markDirty}
      onInput={markDirty}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <div className="contents" key={resetVersion}>
        {children}
      </div>
      <div className="flex flex-col gap-2 rounded-lg border border-primary/15 bg-orange-50/70 p-3 dark:bg-orange-950/20 sm:flex-row sm:items-center sm:justify-between">
        <div
          aria-live="polite"
          className={cn(
            "inline-flex min-h-5 items-center gap-2 text-sm font-semibold",
            status === "error"
              ? "text-red-700 dark:text-red-200"
              : status === "saved"
                ? "text-emerald-700 dark:text-emerald-200"
                : "text-primary"
          )}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {!isPending && status === "saved" ? <CheckCircle2 className="h-4 w-4" /> : null}
          {!isPending && status === "error" ? <AlertTriangle className="h-4 w-4" /> : null}
          {!isPending && status === "idle" ? <Save className="h-4 w-4" /> : null}
          <span>{isPending ? "Salvando alterações..." : message || "Há alterações pendentes."}</span>
        </div>
        <Button
          className={cn(
            "min-w-[138px]",
            !canSubmit && !isPending
              ? "bg-slate-200 text-slate-600 hover:translate-y-0 hover:bg-slate-200 hover:text-slate-600 hover:shadow-sm dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              : ""
          )}
          disabled={isPending || !canSubmit}
          type="submit"
        >
          {isPending ? "Salvando..." : canSubmit ? submitLabel : savedLabel}
        </Button>
      </div>
    </form>
  );
}
