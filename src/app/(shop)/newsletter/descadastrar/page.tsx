import Link from "next/link";
import type { Metadata } from "next";

import { unsubscribeNewsletterByToken } from "@/actions/newsletter";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: "Descadastrar newsletter"
};

export const dynamic = "force-dynamic";

export default async function NewsletterUnsubscribePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const token = readSearchParam((await searchParams)?.token);
  const didUnsubscribe = token ? await unsubscribeNewsletterByToken(token) : false;

  return (
    <main className="geek-page min-h-screen px-4 py-16 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-xl rounded-lg border border-primary/30 bg-card p-6 text-center shadow-md sm:p-8">
        <p className="text-sm font-black uppercase text-primary">Newsletter NerdLingoLab</p>
        <h1 className="mt-3 text-balance text-3xl font-black tracking-normal">
          {didUnsubscribe ? "Descadastro confirmado." : "Link de descadastro inválido."}
        </h1>
        <p className="mt-3 text-pretty text-sm leading-6 text-muted-foreground">
          {didUnsubscribe
            ? "Você saiu da lista de novidades, cupons e campanhas. Sua conta e seus pedidos continuam funcionando normalmente."
            : "Não encontramos uma inscrição ativa com esse link. Ela pode já ter sido removida ou o link pode estar incompleto."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/produtos">Ver produtos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/cupons">Ver cupons</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function readSearchParam(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  const trimmed = text?.trim();

  return trimmed ? trimmed : undefined;
}
