import Link from "next/link";

import { signInCustomerWithCredentials } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { AccountOverview } from "@/features/account/components/account-overview";
import { auth } from "@/lib/auth";
import { getCustomerAccountSummary } from "@/lib/orders/queries";

export const dynamic = "force-dynamic";

interface AccountPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AccountPage({ searchParams }: AccountPageProps): Promise<React.ReactElement> {
  const session = await auth();
  const resolvedSearchParams = await searchParams;
  const confirmedAddressLabel = normalizeSearchParam(resolvedSearchParams?.endereco);

  if (!session?.user?.id) {
    return <AccountLoginPrompt />;
  }

  const account = await getCustomerAccountSummary(session.user.id);

  if (!account) {
    return <AccountLoginPrompt />;
  }

  return (
    <main className="geek-page min-h-screen px-5 py-10">
      <div className="mx-auto w-full max-w-[1360px]">
        <div className="mb-8">
          <h1 className="geek-title text-3xl font-medium tracking-normal text-black">Minha conta</h1>
          <p className="mt-3 text-[#677279]">Acompanhe pedidos e recompensas.</p>
        </div>
        <AccountOverview account={account} confirmedAddressLabel={confirmedAddressLabel} />
      </div>
    </main>
  );
}

function normalizeSearchParam(value: string | string[] | undefined): string | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = rawValue?.trim().slice(0, 120);

  return normalizedValue || undefined;
}

function AccountLoginPrompt(): React.ReactElement {
  return (
    <main className="geek-page min-h-screen px-5 py-10">
      <section className="flex min-h-[820px] items-center justify-center">
        <div className="manga-panel w-full max-w-[460px] rounded-lg bg-white p-8 text-center shadow-sm sm:p-10">
          <h1 className="geek-title justify-center text-3xl font-black text-black">Entrar na conta</h1>
          <p className="mt-4 text-[#4f5d65]">Acesse pedidos, endereços e Nerdcoins.</p>
          <form action={signInCustomerWithCredentials} className="mt-8 grid gap-5 text-left">
            <label className="grid gap-3 text-sm font-bold text-[#1c1c1c]">
              E-mail
              <input className="h-12 rounded-lg border px-3 outline-none focus:border-primary" name="email" type="email" required />
            </label>
            <label className="grid gap-3 text-sm font-bold text-[#1c1c1c]">
              Senha
              <input className="h-12 rounded-lg border px-3 outline-none focus:border-primary" name="password" type="password" required />
            </label>
            <Button className="h-14 w-full bg-black font-black text-white hover:bg-black/90" type="submit">
              Entrar
            </Button>
          </form>
          <div className="mt-6 grid gap-3 text-sm">
            <p>
              Não tem conta? <Link className="font-bold underline" href="/cadastro">Criar conta</Link>
            </p>
            <p>
              É operador? <Link className="font-bold underline" href="/admin/login">Entrar no admin</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
