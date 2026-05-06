"use client";

import { useRef } from "react";

interface ProductFilterFormProps {
  children: React.ReactNode;
}

export function ProductFilterForm({ children }: ProductFilterFormProps): React.ReactElement {
  const timeoutRef = useRef<number | null>(null);

  function submitForm(form: HTMLFormElement, delayMs = 0): void {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      form.requestSubmit();
    }, delayMs);
  }

  function handleInput(event: React.FormEvent<HTMLFormElement>): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || target.name !== "busca") {
      return;
    }

    submitForm(event.currentTarget, 450);
  }

  function handleChange(event: React.FormEvent<HTMLFormElement>): void {
    const target = event.target;

    if (
      !(target instanceof HTMLInputElement || target instanceof HTMLSelectElement) ||
      target.name === "busca"
    ) {
      return;
    }

    submitForm(event.currentTarget);
  }

  return (
    <form
      action="/produtos#lista-produtos"
      className="space-y-6"
      onChange={handleChange}
      onInput={handleInput}
    >
      {children}
    </form>
  );
}
