import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountOverview } from "@/features/account/components/account-overview";
import { auth } from "@/lib/auth";
import { getCustomerAccountSummary } from "@/lib/orders/queries";

export const dynamic = "force-dynamic";

export default async function AccountPage(): Promise<React.ReactElement> {
  const session = await auth();

  if (!session?.user?.id) {
    return <AccountLoginPrompt />;
  }

  const account = await getCustomerAccountSummary(session.user.id);

  if (!account) {
    return <AccountLoginPrompt />;
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Minha conta</h1>
        <p className="mt-3 text-muted-foreground">Acompanhe pedidos e recompensas.</p>
      </div>
      <AccountOverview account={account} />
    </main>
  );
}

function AccountLoginPrompt(): React.ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Entre na sua conta</CardTitle>
          <CardDescription>Acesse seus pedidos e pontos de fidelidade.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/login">Entrar</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
