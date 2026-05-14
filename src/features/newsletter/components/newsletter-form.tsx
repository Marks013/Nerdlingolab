"use client";

import { useState, type FormEvent } from "react";

interface NewsletterState {
  message: string | null;
  ok: boolean;
}

const initialState: NewsletterState = {
  message: null,
  ok: false
};

export function NewsletterForm(): React.ReactElement {
  const [state, setState] = useState<NewsletterState>(initialState);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsPending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/newsletter", {
        body: JSON.stringify({
          email: formData.get("email"),
          website: formData.get("website") ?? undefined
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const payload = await response.json().catch(() => null) as Partial<NewsletterState> | null;

      setState({
        message: payload?.message ?? "Não foi possível confirmar sua inscrição agora.",
        ok: response.ok && payload?.ok === true
      });

      if (response.ok) {
        form.reset();
      }
    } catch {
      setState({
        message: "Não foi possível confirmar sua inscrição agora.",
        ok: false
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="mt-6 grid gap-3" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="footer-email">Newsletter</label>
      <input
        aria-hidden="true"
        autoComplete="off"
        className="hidden"
        id="footer-website"
        name="website"
        tabIndex={-1}
        type="text"
      />
      <input
        className="h-12 rounded-lg border border-[#d7dde1] px-4 text-sm outline-none transition focus:border-primary"
        id="footer-email"
        maxLength={160}
        name="email"
        placeholder="Seu e-mail"
        required
        type="email"
      />
      <NewsletterSubmitButton isPending={isPending} />
      {state.message ? (
        <p className={state.ok ? "text-sm font-semibold text-[#237f34]" : "text-sm font-semibold text-destructive"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function NewsletterSubmitButton({ isPending }: { isPending: boolean }): React.ReactElement {
  return (
    <button
      className="h-12 rounded-lg bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={isPending}
      type="submit"
    >
      {isPending ? "Enviando..." : "Enviar"}
    </button>
  );
}
