"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import {
  supportSubjectLabels,
  supportSubjects,
  type SupportRequestInput
} from "@/lib/support/schema";

interface SupportHistoryItem {
  createdAt: string;
  subject: string;
  ticketId: string;
}

const storageKey = "nerdlingolab:support-history";

export function SupportContactClient(): React.ReactElement {
  const [history, setHistory] = useState<SupportHistoryItem[]>(() => loadHistory());
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"error" | "idle" | "sending" | "success">("idle");

  async function submitSupport(formData: FormData): Promise<void> {
    setMessage(null);
    setStatus("sending");

    const payload: SupportRequestInput = {
      email: String(formData.get("email") ?? ""),
      message: String(formData.get("message") ?? ""),
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      subject: String(formData.get("subject") ?? "produto") as SupportRequestInput["subject"]
    };

    try {
      const response = await fetch("/api/support", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const responseBody = await response.json() as { message?: string; subject?: string; ticketId?: string };

      if (!response.ok || !responseBody.ticketId) {
        throw new Error(responseBody.message ?? "Não foi possível enviar sua mensagem agora.");
      }

      const nextHistory = [
        {
          createdAt: new Date().toISOString(),
          subject: supportSubjectLabels[payload.subject],
          ticketId: responseBody.ticketId
        },
        ...history
      ].slice(0, 5);

      setHistory(nextHistory);
      window.localStorage.setItem(storageKey, JSON.stringify(nextHistory));
      setMessage(`Mensagem enviada. Protocolo ${responseBody.ticketId}.`);
      setStatus("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar sua mensagem agora.");
      setStatus("error");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      <form action={submitSupport} className="rounded-lg bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-2xl font-black text-black">Envie sua mensagem</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Seu Nome *" name="name" required />
          <Field label="Seu Email *" name="email" required type="email" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Telefone (opcional)" name="phone" />
          <label className="grid gap-2 text-sm font-bold text-black">
            Assunto *
            <select
              className="h-11 rounded-lg border border-[#d9e0e4] bg-white px-3 text-sm text-black outline-none transition focus:border-primary"
              name="subject"
              required
            >
              {supportSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {supportSubjectLabels[subject]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-bold text-black">
          Sua Mensagem *
          <textarea
            className="min-h-40 rounded-lg border border-[#d9e0e4] bg-white px-3 py-3 text-sm text-black outline-none transition placeholder:text-[#7d8990] focus:border-primary"
            maxLength={1800}
            minLength={20}
            name="message"
            required
          />
        </label>
        {message ? (
          <p
            className={[
              "mt-4 rounded-lg border px-4 py-3 text-sm font-bold",
              status === "success" ? "border-[#b8e8c5] bg-[#f2fff6] text-[#176c35]" : "border-[#f2b8b8] bg-[#fff5f5] text-[#9b1c1c]"
            ].join(" ")}
          >
            {message}
          </p>
        ) : null}
        <button
          className="mt-5 inline-flex h-12 items-center justify-center rounded-lg bg-primary px-5 text-sm font-black text-white transition hover:bg-[#d85b00] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "sending"}
          type="submit"
        >
          <Send className="mr-2 h-4 w-4" />
          {status === "sending" ? "Enviando..." : "Enviar Mensagem"}
        </button>
      </form>

      <aside className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-black">Últimos abertos</h2>
        <p className="mt-2 text-sm leading-6 text-[#4f5d65]">
          O histórico aparece somente quando o envio é confirmado.
        </p>
        <div className="mt-5 grid gap-3">
          {history.length > 0 ? (
            history.map((item) => (
              <div className="rounded-lg border border-[#eeeeee] p-3" key={item.ticketId}>
                <p className="text-sm font-black text-black">{item.ticketId}</p>
                <p className="mt-1 text-sm text-[#4f5d65]">{item.subject}</p>
                <p className="mt-1 text-xs font-semibold text-[#677279]">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.createdAt))}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-[#4f5d65]">Nenhum protocolo aberto neste navegador.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function loadHistory(): SupportHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedHistory = window.localStorage.getItem(storageKey);

  return storedHistory ? JSON.parse(storedHistory) as SupportHistoryItem[] : [];
}

function Field({
  label,
  name,
  required = false,
  type = "text"
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}): React.ReactElement {
  return (
    <label className="grid gap-2 text-sm font-bold text-black">
      {label}
      <input
        className="h-11 rounded-lg border border-[#d9e0e4] bg-white px-3 text-sm text-black outline-none transition focus:border-primary"
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}
