import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Clock3, Headphones, ShieldCheck, ShoppingBag, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: "Retorno do checkout"
};

interface CheckoutReturnPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function CheckoutReturnPage({
  searchParams
}: CheckoutReturnPageProps): Promise<React.ReactElement> {
  const { status } = await searchParams;
  const isApproved = status === "success" || status === "approved";
  const isRejected = status === "failure" || status === "rejected";
  const title = isApproved ? "Pagamento aprovado" : isRejected ? "Pagamento não aprovado" : "Pagamento em processamento";
  const message = isApproved
    ? "Recebemos a confirmação do Mercado Pago. Seu pedido será preparado e você poderá acompanhar tudo em Meus Pedidos."
    : isRejected
      ? "O Mercado Pago não confirmou essa tentativa. Você pode tentar novamente ou falar com o suporte para analisarmos juntos."
      : "Estamos aguardando a confirmação do Mercado Pago. Assim que o webhook responder, o pedido será atualizado automaticamente.";
  const Icon = isApproved ? CheckCircle2 : isRejected ? XCircle : Clock3;
  const tone = isApproved
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : isRejected
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-orange-200 bg-orange-50 text-primary";

  return (
    <main className="geek-page min-h-screen px-4 py-10">
      <section className="mx-auto flex min-h-[70dvh] w-full max-w-3xl items-center">
        <Card className="w-full overflow-hidden border-orange-100 shadow-sm">
          <CardHeader className="bg-[#fffaf6] text-center">
            <span className={`mx-auto flex size-16 items-center justify-center rounded-full border ${tone}`}>
              <Icon className="size-8" />
            </span>
            <CardTitle className="mt-4 text-balance text-3xl font-black tracking-normal text-black">{title}</CardTitle>
            <CardDescription className="mx-auto max-w-xl text-pretty text-base leading-7">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <ReturnInfo icon={ShieldCheck} text="Pagamento protegido pelo Mercado Pago." />
              <ReturnInfo icon={ShoppingBag} text="Pedido salvo para acompanhamento." />
              <ReturnInfo icon={Headphones} text="Suporte disponível se algo fugir do esperado." />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Link href="/conta#pedidos">Ver meus pedidos</Link>
              </Button>
              <Button asChild className="border-primary/50 bg-white text-primary hover:bg-primary/10" variant="outline">
                <Link href="/produtos">Continuar comprando</Link>
              </Button>
              {isRejected ? (
                <Button asChild className="border-red-200 bg-white text-red-700 hover:bg-red-50" variant="outline">
                  <Link href="/suporte">Falar com suporte</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function ReturnInfo({
  icon: Icon,
  text
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-orange-100 bg-white p-4 text-center shadow-sm">
      <span className="mx-auto flex size-10 items-center justify-center rounded-lg bg-orange-50 text-primary">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-pretty text-sm font-semibold leading-5 text-[#3a2a1c]">{text}</p>
    </div>
  );
}
