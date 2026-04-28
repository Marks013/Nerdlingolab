import Link from "next/link";

import { requestPasswordReset } from "@/actions/auth";
import { Button } from "@/components/ui/button";

interface ForgotPasswordPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps): Promise<React.ReactElement> {
  const resolvedSearchParams = await searchParams;
  const status = Array.isArray(resolvedSearchParams?.status) ? resolvedSearchParams?.status[0] : resolvedSearchParams?.status;

  return (
    <main className="geek-page min-h-screen px-5 py-10">
      <section className="flex min-h-[680px] items-center justify-center">
        <div className="manga-panel w-full max-w-[500px] rounded-lg bg-white p-8 shadow-sm sm:p-10">
          <p className="text-sm font-black uppercase text-primary">Senha</p>
          <h1 className="mt-2 text-3xl font-black text-black">Redefinir acesso</h1>
          <p className="mt-4 text-sm leading-6 text-[#4f5d65]">
            Informe seu e-mail. Se existir uma conta com senha cadastrada, enviaremos um link seguro para recriar a senha.
          </p>
          {status === "sent" ? (
            <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              Se o e-mail estiver cadastrado, o link de redefinição foi enviado.
            </p>
          ) : null}
          <form action={requestPasswordReset} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-black">
              E-mail
              <input className="h-12 rounded-lg border px-3 outline-none focus:border-primary" name="email" required type="email" />
            </label>
            <Button className="h-12 bg-primary text-white" type="submit">Enviar link seguro</Button>
          </form>
          <p className="mt-6 text-center text-sm text-[#4f5d65]">
            Lembrou a senha? <Link className="font-bold text-primary underline" href="/entrar">Entrar</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
