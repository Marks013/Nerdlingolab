"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { subscribeNewsletter, type NewsletterState } from "@/actions/newsletter";

const initialState: NewsletterState = {
  message: null,
  ok: false
};

export function NewsletterForm(): React.ReactElement {
  const [state, formAction] = useActionState(subscribeNewsletter, initialState);

  return (
    <form action={formAction} className="mt-6 grid gap-3">
      <label className="sr-only" htmlFor="footer-email">Newsletter</label>
      <input
        className="h-12 rounded-lg border border-[#d7dde1] px-4 text-sm outline-none transition focus:border-primary"
        id="footer-email"
        maxLength={160}
        name="email"
        placeholder="Seu e-mail"
        required
        type="email"
      />
      <NewsletterSubmitButton />
      {state.message ? (
        <p className={state.ok ? "text-sm font-semibold text-[#237f34]" : "text-sm font-semibold text-destructive"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function NewsletterSubmitButton(): React.ReactElement {
  const status = useFormStatus();

  return (
    <button
      className="h-12 rounded-lg bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={status.pending}
      type="submit"
    >
      {status.pending ? "Enviando..." : "Enviar"}
    </button>
  );
}
