"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

import "@/app/globals.css";

interface GlobalErrorPageProps {
  error: Error & { digest?: string };
}

export default function GlobalErrorPage({ error }: GlobalErrorPageProps): React.ReactElement {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html className="dark" lang="pt-BR">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
          <section className="max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
            <h1 className="text-2xl font-bold tracking-normal">Estamos ajustando a experiência</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              A página não carregou como deveria. Recarregue em alguns instantes ou volte para a vitrine.
            </p>
            <Link
              className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
              href="/"
            >
              Voltar para a vitrine
            </Link>
          </section>
        </main>
      </body>
    </html>
  );
}
