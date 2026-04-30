"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";

import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";

export function AccountLoginPrompt({ message }: { message?: string | null }): React.ReactElement {
  const [errorMessage, setErrorMessage] = useState<string | null>(message ?? null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (!result?.ok) {
        setErrorMessage("E-mail ou senha inválidos. Confira os dados e tente novamente.");
        return;
      }

      window.location.href = "/conta";
    });
  }

  return (
    <main className="geek-page min-h-screen px-5 py-10">
      <section className="flex min-h-[720px] items-center justify-center">
        <div className="manga-panel relative w-full max-w-[460px] rounded-lg bg-white p-7 text-black shadow-sm sm:p-10">
          <p className="text-sm font-black uppercase text-primary">Área do cliente</p>
          <h1 className="mt-2 text-3xl font-black">Entrar na conta</h1>
          <p className="mt-3 text-sm leading-6 text-[#4f5d65]">
            Acesse pedidos, favoritos, endereços e Nerdcoins com o mesmo login rápido do topo da loja.
          </p>

          <div className="mt-6">
            <GoogleSignInButton />
          </div>
          <div className="my-5 flex items-center gap-3 text-xs font-black uppercase text-[#8a959b]">
            <span className="h-px flex-1 bg-[#e5e7eb]" />
            ou entre com e-mail
            <span className="h-px flex-1 bg-[#e5e7eb]" />
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-bold">
              E-mail
              <input
                autoComplete="email"
                className="h-12 rounded-lg border px-3 outline-none focus:border-primary"
                name="email"
                required
                type="email"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Senha
              <input
                autoComplete="current-password"
                className="h-12 rounded-lg border px-3 outline-none focus:border-primary"
                minLength={8}
                name="password"
                required
                type="password"
              />
            </label>
            {errorMessage ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {errorMessage}
              </p>
            ) : null}
            <button
              className="h-12 rounded-lg bg-primary px-5 text-sm font-black text-white transition hover:bg-primary/90 disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-5 grid gap-2 text-center text-sm text-[#4f5d65]">
            <Link className="font-bold text-primary underline" href="/recuperar-senha">
              Esqueci minha senha
            </Link>
            <p>
              Ainda não tem conta?{" "}
              <Link className="font-bold text-primary underline" href="/cadastro">
                Criar cadastro
              </Link>
            </p>
            <p>
              É operador?{" "}
              <Link className="font-bold text-primary underline" href="/admin/login">
                Entrar no admin
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
