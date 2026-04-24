import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CheckoutReturnPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function CheckoutReturnPage({
  searchParams
}: CheckoutReturnPageProps): Promise<React.ReactElement> {
  const { status } = await searchParams;
  const title = status === "success" ? "Pagamento aprovado" : "Pagamento em processamento";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Assim que o Mercado Pago confirmar o status, o pedido sera atualizado pelo webhook.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/produtos">Voltar para a loja</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
