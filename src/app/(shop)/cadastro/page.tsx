import Link from "next/link";

import { registerCustomer } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { normalizeReferralCode } from "@/lib/loyalty/referrals";

interface RegisterPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps): Promise<React.ReactElement> {
  const resolvedSearchParams = await searchParams;
  const referralCode = normalizeReferralCode(
    Array.isArray(resolvedSearchParams?.ref) ? resolvedSearchParams?.ref[0] : resolvedSearchParams?.ref
  );

  return (
    <main className="geek-page min-h-screen px-5 py-10">
      <section className="flex min-h-[760px] items-center justify-center">
        <div className="manga-panel w-full max-w-[540px] rounded-lg bg-white p-8 shadow-sm sm:p-10">
          <h1 className="geek-title justify-center text-center text-3xl font-black text-black">Criar conta</h1>
          <p className="mt-4 text-center text-[#4f5d65]">
            Salve seus dados, acompanhe pedidos e use Nerdcoins.
          </p>
          <form action={registerCustomer} className="mt-8 grid gap-4">
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
            <Button className="h-12 bg-primary text-white" type="submit">Criar conta</Button>
          </form>
          <p className="mt-6 text-center text-sm text-[#4f5d65]">
            Já tem conta? <Link className="font-bold underline" href="/conta">Entrar</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
