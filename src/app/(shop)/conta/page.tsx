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
  const loginMessage = getLoginMessage(
    normalizeSearchParam(resolvedSearchParams?.error),
    normalizeSearchParam(resolvedSearchParams?.reset)
  );

  if (!session?.user?.id) {
    return <AccountLoginPrompt message={loginMessage} />;
  }

  const account = await getCustomerAccountSummary(session.user.id);

  if (!account) {
    return <AccountLoginPrompt message={loginMessage} />;
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

function AccountLoginPrompt({ message }: { message?: string | null }): React.ReactElement {
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
            {message ? (
              <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-black">
                {message}
              </p>
            ) : null}
          </form>
          <div className="mt-6 grid gap-3 text-sm">
            <p>
              Esqueceu a senha? <Link className="font-bold underline" href="/recuperar-senha">Redefinir senha</Link>
            </p>
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

function getLoginMessage(error?: string, reset?: string): string | null {
  if (reset === "success") {
    return "Senha atualizada com sucesso. Entre com sua nova senha.";
  }

  if (error === "too_many_attempts") {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }

  if (error) {
    return "E-mail ou senha inválidos. Confira os dados e tente novamente.";
  }

  return null;
}
