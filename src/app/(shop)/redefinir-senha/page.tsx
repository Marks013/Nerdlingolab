import Link from "next/link";

import { resetCustomerPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";

interface ResetPasswordPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps): Promise<React.ReactElement> {
  const resolvedSearchParams = await searchParams;
  const token = readParam(resolvedSearchParams?.token);
  const userId = readParam(resolvedSearchParams?.u);
  const error = readParam(resolvedSearchParams?.error);
  const isValidLink = Boolean(token && userId);

  return (
    <main className="geek-page min-h-screen px-5 py-10">
      <section className="flex min-h-[680px] items-center justify-center">
        <div className="manga-panel w-full max-w-[500px] rounded-lg bg-white p-8 shadow-sm sm:p-10">
          <p className="text-sm font-black uppercase text-primary">Acesso seguro</p>
          <h1 className="mt-2 text-3xl font-black text-black">Criar nova senha</h1>
          {!isValidLink ? (
            <div className="mt-6 grid gap-4">
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                Link inválido ou incompleto.
              </p>
              <Link className="font-bold text-primary underline" href="/recuperar-senha">Solicitar novo link</Link>
            </div>
          ) : (
            <>
              <p className="mt-4 text-sm leading-6 text-[#4f5d65]">
                Digite uma senha nova. O link será invalidado após a troca.
              </p>
              {error ? (
                <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {error === "expired" ? "Link expirado ou já utilizado." : "Confira os campos e tente novamente."}
                </p>
              ) : null}
              <form action={resetCustomerPassword} className="mt-6 grid gap-4">
                <input name="token" type="hidden" value={token} />
                <input name="userId" type="hidden" value={userId} />
                <label className="grid gap-2 text-sm font-bold text-black">
                  Nova senha
                  <input className="h-12 rounded-lg border px-3 outline-none focus:border-primary" minLength={8} name="password" required type="password" />
                </label>
                <label className="grid gap-2 text-sm font-bold text-black">
                  Confirmar nova senha
                  <input className="h-12 rounded-lg border px-3 outline-none focus:border-primary" minLength={8} name="confirmPassword" required type="password" />
                </label>
                <Button className="h-12 bg-primary text-white" type="submit">Salvar nova senha</Button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function readParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}
