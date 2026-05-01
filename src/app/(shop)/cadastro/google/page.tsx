import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { completeCustomerRegistration } from "@/actions/account-profile";
import { Button } from "@/components/ui/button";
import { isCustomerRegistrationComplete, sanitizeCustomerNextPath } from "@/lib/account/completion";
import { auth } from "@/lib/auth";
import { formatCpf } from "@/lib/identity/brazil";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Finalizar cadastro",
  description: "Complete CPF, data de nascimento e aceites obrigatorios para usar sua conta NerdLingoLab."
};

interface GoogleRegistrationPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function formatBirthdayInput(value: Date | null): string {
  return value?.toISOString().slice(0, 10) ?? "";
}

export default async function GoogleRegistrationPage({
  searchParams
}: GoogleRegistrationPageProps): Promise<React.ReactElement> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/conta");
  }

  const resolvedSearchParams = await searchParams;
  const nextPath = sanitizeCustomerNextPath(
    Array.isArray(resolvedSearchParams?.next) ? resolvedSearchParams.next[0] : resolvedSearchParams?.next
  );
  const error = Array.isArray(resolvedSearchParams?.error) ? resolvedSearchParams.error[0] : resolvedSearchParams?.error;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      birthday: true,
      cpf: true,
      email: true,
      name: true,
      phone: true,
      privacyAcceptedAt: true,
      termsAcceptedAt: true
    }
  });

  if (!user) {
    redirect("/conta");
  }

  if (isCustomerRegistrationComplete(user)) {
    redirect(nextPath);
  }

  return (
    <main className="geek-page min-h-screen px-5 py-10">
      <section className="flex min-h-[760px] items-center justify-center">
        <div className="manga-panel w-full max-w-[560px] rounded-lg bg-white p-8 shadow-sm sm:p-10">
          <p className="text-center text-sm font-black uppercase text-primary">Cadastro Google</p>
          <h1 className="mt-2 text-center text-3xl font-black text-black">Finalize sua conta</h1>
          <p className="mt-4 text-center leading-6 text-[#4f5d65]">
            Para manter checkout, suporte, cupons e pedidos seguros, precisamos confirmar CPF, nascimento e aceites legais.
          </p>
          {error ? (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error === "cpf" ? "Este CPF já está vinculado a outra conta." : "Revise os dados obrigatórios."}
            </p>
          ) : null}
          <form action={completeCustomerRegistration} className="mt-7 grid gap-4">
            <input name="nextPath" type="hidden" value={nextPath} />
            <label className="grid gap-2 text-sm font-bold text-black">
              E-mail Google
              <input className="h-12 rounded-lg border bg-[#f7f7f7] px-3 text-[#677279]" disabled value={user.email} />
            </label>
            <label className="grid gap-2 text-sm font-bold text-black">
              Nome
              <input className="h-12 rounded-lg border px-3 outline-none focus:border-primary" defaultValue={user.name ?? ""} name="name" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-black">
              Telefone
              <input className="h-12 rounded-lg border px-3 outline-none focus:border-primary" defaultValue={user.phone ?? ""} name="phone" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-black">
                CPF
                <input
                  className="h-12 rounded-lg border px-3 outline-none focus:border-primary"
                  defaultValue={formatCpf(user.cpf)}
                  inputMode="numeric"
                  maxLength={14}
                  name="cpf"
                  placeholder="000.000.000-00"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-black">
                Data de nascimento
                <input
                  className="h-12 rounded-lg border px-3 outline-none focus:border-primary"
                  defaultValue={formatBirthdayInput(user.birthday)}
                  name="birthday"
                  required
                  type="date"
                />
              </label>
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-[#f0dfd6] bg-[#fffaf6] p-3 text-sm leading-6 text-[#4f5d65]">
              <input className="mt-1 h-4 w-4 accent-primary" name="acceptTerms" required type="checkbox" />
              <span>
                Li e aceito os{" "}
                <Link className="font-black text-primary underline-offset-4 hover:underline" href="/termos-de-uso">
                  Termos de Uso
                </Link>.
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-[#f0dfd6] bg-[#fffaf6] p-3 text-sm leading-6 text-[#4f5d65]">
              <input className="mt-1 h-4 w-4 accent-primary" name="acceptPrivacy" required type="checkbox" />
              <span>
                Li e aceito a{" "}
                <Link className="font-black text-primary underline-offset-4 hover:underline" href="/politica-de-privacidade">
                  Politica de Privacidade
                </Link>.
              </span>
            </label>
            <Button className="h-12 bg-primary text-white" type="submit">Finalizar cadastro</Button>
          </form>
        </div>
      </section>
    </main>
  );
}
