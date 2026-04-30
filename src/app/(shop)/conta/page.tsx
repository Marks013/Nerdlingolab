import { AccountLoginPrompt } from "@/features/account/components/account-login-prompt";
import { AccountOverview } from "@/features/account/components/account-overview";
import { sanitizeCustomerNextPath } from "@/lib/account/completion";
import { auth } from "@/lib/auth";
import { getCustomerAccountSummary } from "@/lib/orders/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface AccountPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AccountPage({ searchParams }: AccountPageProps): Promise<React.ReactElement> {
  const session = await auth();
  const resolvedSearchParams = await searchParams;
  const confirmedAddressLabel = normalizeSearchParam(resolvedSearchParams?.endereco);
  const googleStatus = normalizeSearchParam(resolvedSearchParams?.google);
  const loginMessage = getLoginMessage(
    normalizeSearchParam(resolvedSearchParams?.error),
    normalizeSearchParam(resolvedSearchParams?.reset)
  );

  if (!session?.user?.id) {
    return <AccountLoginPrompt message={loginMessage} />;
  }

  if (!session.user.customerRegistrationComplete) {
    redirect(`/cadastro/google?next=${encodeURIComponent(sanitizeCustomerNextPath("/conta"))}`);
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
          {googleStatus === "linked" ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Conta Google vinculada com sucesso.
            </p>
          ) : null}
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
