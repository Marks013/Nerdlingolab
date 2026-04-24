"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";

interface AppErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppErrorPage({ error, reset }: AppErrorPageProps): React.ReactElement {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="space-y-4">
        <EmptyState
          description="Algo saiu do esperado. Você pode tentar novamente agora ou voltar para a vitrine."
          title="Não conseguimos carregar a página"
          tone="warning"
        />
        <div className="flex justify-center gap-2">
          <Button onClick={reset} type="button">
            Tentar novamente
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Voltar para a vitrine</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
