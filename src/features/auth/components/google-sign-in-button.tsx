"use client";

import { signIn } from "next-auth/react";
import { useTransition } from "react";

import { cn } from "@/lib/utils";

interface GoogleSignInButtonProps {
  callbackUrl?: string;
  className?: string;
  label?: string;
}

export function GoogleSignInButton({
  callbackUrl = "/cadastro/google",
  className,
  label = "Continuar com Google"
}: GoogleSignInButtonProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[#d9e0e4] bg-white px-4 text-sm font-black text-black shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      disabled={isPending}
      onClick={() => startTransition(() => void signIn("google", { callbackUrl }))}
      type="button"
    >
      <GoogleMark />
      {isPending ? "Conectando..." : label}
    </button>
  );
}

function GoogleMark(): React.ReactElement {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.5h3.2c1.9-1.7 3.1-4.3 3.1-7.3Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 5-0.9 6.7-2.5L15.5 17c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.3H2.9v2.6A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.2 13.6a6 6 0 0 1 0-3.2V7.8H2.9a10 10 0 0 0 0 8.4l3.3-2.6Z" fill="#FBBC05" />
      <path d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-9.1 5.8l3.3 2.6C7 7.9 9.3 6.1 12 6.1Z" fill="#EA4335" />
    </svg>
  );
}
