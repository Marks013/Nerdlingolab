import Link from "next/link";
import type { Metadata } from "next";

import { registerCustomer } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { sanitizeCustomerNextPath } from "@/lib/account/completion";
import { normalizeReferralCode } from "@/lib/loyalty/referrals";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: "Criar conta"
};

interface RegisterPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps): Promise<React.ReactElement> {
  const resolvedSearchParams = await searchParams;
  const referralCode = normalizeReferralCode(
    Array.isArray(resolvedSearchParams?.ref) ? resolvedSearchParams?.ref[0] : resolvedSearchParams?.ref
  );
  const checkoutFlow = normalizeSearchParam(resolvedSearchParams?.checkout) === "1";
  const requestedNextPath = sanitizeCustomerNextPath(
    Array.isArray(resolvedSearchParams?.next) ? resolvedSearchParams.next[0] : resolvedSearchParams?.next,
    "/conta"
  );
  const isCheckoutReturn = checkoutFlow && requestedNextPath === "/checkout";
  const nextPath = isCheckoutReturn ? "/checkout" : "/conta";

  return (
    <main className="geek-page min-h-screen px-5 py-10">
      <section className="flex min-h-[760px] items-center justify-center">
        <div className="manga-panel w-full max-w-[540px] rounded-lg bg-white p-8 shadow-sm sm:p-10">
          <h1 className="geek-title justify-center text-center text-3xl font-black text-black">Criar conta</h1>
          <p className="mt-4 text-center text-[#4f5d65]">
            {isCheckoutReturn
              ? "Crie sua conta para salvar os dados do pedido e continuar o checkout."
              : "Salve seus dados, acompanhe pedidos e use Nerdcoins."}
          </p>
          <div className="mt-8">
            <GoogleSignInButton
              callbackUrl={`/cadastro/google?next=${encodeURIComponent(nextPath)}`}
              label="Cadastrar com Google"
            />
          </div>
          <div className="my-5 flex items-center gap-3 text-xs font-black uppercase text-[#8a959b]">
            <span className="h-px flex-1 bg-[#e5e7eb]" />
            ou cadastre com e-mail
            <span className="h-px flex-1 bg-[#e5e7eb]" />
          </div>

          <form action={registerCustomer} className="grid gap-4">
            <input name="nextPath" type="hidden" value={nextPath} />
            {referralCode ? <input name="referralCode" type="hidden" value={referralCode} /> : null}
            {referralCode ? (
              <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-bold text-black">
                Convite aplicado: {referralCode}
              </p>
            ) : null}
            <label className="grid gap-2 text-sm font-bold text-black">
              Nome
              <input className="h-12 rounded-lg border px-3 outline-none focus:border-primary" name="name" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-black">
              E-mail
              <input className="h-12 rounded-lg border px-3 outline-none focus:border-primary" name="email" required type="email" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-black">
                Telefone
                <input className="h-12 rounded-lg border px-3 outline-none focus:border-primary" name="phone" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-black">
                CPF
                <input
                  className="h-12 rounded-lg border px-3 outline-none focus:border-primary"
                  inputMode="numeric"
                  maxLength={14}
                  name="cpf"
                  placeholder="000.000.000-00"
                  required
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-bold text-black">
              Data de nascimento
              <input className="h-12 rounded-lg border px-3 outline-none focus:border-primary" name="birthday" required type="date" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-black">
              Senha
              <input className="h-12 rounded-lg border px-3 outline-none focus:border-primary" minLength={8} name="password" required type="password" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-black">
              Confirmar senha
              <input className="h-12 rounded-lg border px-3 outline-none focus:border-primary" minLength={8} name="confirmPassword" required type="password" />
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-[#f0dfd6] bg-[#fffaf6] p-3 text-sm leading-6 text-[#4f5d65]">
              <input className="mt-1 h-4 w-4 accent-primary" name="acceptTerms" required type="checkbox" />
              <span>
                Li e aceito os{" "}
                <Link className="font-black text-primary underline-offset-4 hover:underline" href="/termos-de-uso">
                  Termos de Uso
                </Link>{" "}
                da NerdLingoLab.
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-[#f0dfd6] bg-[#fffaf6] p-3 text-sm leading-6 text-[#4f5d65]">
              <input className="mt-1 h-4 w-4 accent-primary" name="acceptPrivacy" required type="checkbox" />
              <span>
                Li e aceito a{" "}
                <Link className="font-black text-primary underline-offset-4 hover:underline" href="/politica-de-privacidade">
                  Politica de Privacidade
                </Link>{" "}
                e autorizo o tratamento dos meus dados para criar conta, comprar e receber atendimento.
              </span>
            </label>
            <Button className="h-12 bg-primary text-white" type="submit">Criar conta</Button>
          </form>
          <p className="mt-6 text-center text-sm text-[#4f5d65]">
            Já tem conta?{" "}
            <Link
              className="font-bold underline"
              href={
                isCheckoutReturn
                  ? `/conta?checkout=1&next=${encodeURIComponent(nextPath)}`
                  : `/conta?next=${encodeURIComponent(nextPath)}`
              }
            >
              Entrar
            </Link>
          </p>
          {isCheckoutReturn ? (
            <p className="mt-3 text-center text-sm text-[#4f5d65]">
              Nao quer finalizar agora?{" "}
              <Link className="font-bold underline" href="/produtos">
                Continuar comprando
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function normalizeSearchParam(value: string | string[] | undefined): string | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = rawValue?.trim().slice(0, 120);

  return normalizedValue || undefined;
}
