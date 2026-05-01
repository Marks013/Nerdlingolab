"use client";

import { X } from "lucide-react";
import Link from "next/link";

import { signInCustomerWithCredentials } from "@/actions/auth";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps): React.ReactElement | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8">
      <div className="manga-panel relative w-full max-w-[440px] rounded-lg bg-white p-7 text-black shadow-2xl">
        <button
          aria-label="Fechar login"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white text-black transition hover:border-primary hover:text-primary"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-sm font-black uppercase text-primary">Área do cliente</p>
        <h2 className="mt-2 text-3xl font-black">Entrar na conta</h2>
        <p className="mt-3 text-sm leading-6 text-[#4f5d65]">
          Acesse pedidos, favoritos, endereços e Nerdcoins sem sair da loja.
        </p>

        <div className="mt-6">
          <GoogleSignInButton />
        </div>
        <div className="my-5 flex items-center gap-3 text-xs font-black uppercase text-[#8a959b]">
          <span className="h-px flex-1 bg-[#e5e7eb]" />
          ou entre com e-mail
          <span className="h-px flex-1 bg-[#e5e7eb]" />
        </div>

        <form action={signInCustomerWithCredentials} className="grid gap-4">
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
          <button
            className="h-12 rounded-lg bg-primary px-5 text-sm font-black text-white transition hover:bg-primary/90"
            type="submit"
          >
            Entrar
          </button>
        </form>

        <div className="mt-5 grid gap-2 text-center text-sm text-[#4f5d65]">
          <Link className="font-bold text-primary underline" href="/recuperar-senha" onClick={onClose}>
            Esqueci minha senha
          </Link>
          <p>
            Ainda não tem conta?{" "}
            <Link className="font-bold text-primary underline" href="/cadastro" onClick={onClose}>
              Criar cadastro
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
