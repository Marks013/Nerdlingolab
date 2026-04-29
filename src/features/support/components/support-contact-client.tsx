"use client";

import { History, MessageCircle, Send } from "lucide-react";
import { useEffect, useState } from "react";

import {
  supportSubjectLabels,
  supportSubjects,
  type SupportRequestInput
} from "@/lib/support/schema";

interface SupportHistoryItem {
  createdAt: string;
  message?: string;
  replies?: SupportReplyItem[];
  status?: string;
  subject: string;
  ticketId: string;
}

interface SupportReplyItem {
  createdAt: string;
  deliveryStatus: string;
  id: string;
  message: string;
}

interface SupportHistoryResponse {
  tickets: Array<{
    createdAt: string;
    message: string;
    replies: SupportReplyItem[];
    status: string;
    subjectLabel: string;
    ticketId: string;
  }>;
}

interface SupportContactClientProps {
  initialEmail?: string;
  initialName?: string;
}

const storageKey = "nerdlingolab:support-history";

export function SupportContactClient({
  initialEmail = "",
  initialName = ""
}: SupportContactClientProps): React.ReactElement {
  const [history, setHistory] = useState<SupportHistoryItem[]>(() => loadHistory());
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"error" | "idle" | "sending" | "success">("idle");

  useEffect(() => {
    let isMounted = true;

    async function loadServerHistory(): Promise<void> {
      try {
        const response = await fetch("/api/support", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const payload = await response.json() as SupportHistoryResponse;
        const tickets = payload.tickets.map((ticket) => ({
          createdAt: ticket.createdAt,
          message: ticket.message,
          replies: ticket.replies,
          status: ticket.status,
          subject: ticket.subjectLabel,
          ticketId: ticket.ticketId
        }));

        if (isMounted && tickets.length > 0) {
          setHistory(tickets);
        }
      } catch {
        // Local protocol history remains available even when the account history cannot be loaded.
      }
    }

    void loadServerHistory();

    return () => {
      isMounted = false;
    };
  }, []);

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
          message: payload.message,
          replies: [],
          status: "OPEN",
          subject: supportSubjectLabels[payload.subject],
          ticketId: responseBody.ticketId
        },
        ...history
      ].slice(0, 5);

      setHistory(nextHistory);
      window.localStorage.setItem(storageKey, JSON.stringify(nextHistory));
      setMessage(`${responseBody.message ?? "Mensagem registrada."} Protocolo ${responseBody.ticketId}.`);
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
          <Field defaultValue={initialName} label="Seu Nome *" name="name" required />
          <Field defaultValue={initialEmail} label="Seu Email *" name="email" required type="email" />
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
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-black text-black">Histórico de suporte</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#4f5d65]">
          Usuários logados veem conversas e respostas da equipe neste painel.
        </p>
        <div className="mt-5 grid gap-3">
          {history.length > 0 ? (
            history.map((item) => (
              <div className="rounded-lg border border-[#eeeeee] p-3" key={item.ticketId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-black">{item.ticketId}</p>
                    <p className="mt-1 text-sm text-[#4f5d65]">{item.subject}</p>
                  </div>
                  {item.status ? <span className="rounded-full border px-2 py-1 text-[11px] font-bold text-[#4f5d65]">{formatTicketStatus(item.status)}</span> : null}
                </div>
                <p className="mt-1 text-xs font-semibold text-[#677279]">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.createdAt))}
                </p>
                {item.message ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#4f5d65]">{item.message}</p> : null}
                {item.replies && item.replies.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {item.replies.map((reply) => (
                      <div className="rounded-lg bg-[#f7f7f7] p-3" key={reply.id}>
                        <p className="flex items-center gap-2 text-xs font-black text-black">
                          <MessageCircle className="h-3.5 w-3.5 text-primary" />
                          Resposta da equipe
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#4f5d65]">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-[#4f5d65]">Nenhum protocolo aberto ainda.</p>
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

  try {
    const storedHistory = window.localStorage.getItem(storageKey);

    return storedHistory ? JSON.parse(storedHistory) as SupportHistoryItem[] : [];
  } catch {
    return [];
  }
}

function Field({
  defaultValue,
  label,
  name,
  required = false,
  type = "text"
}: {
  defaultValue?: string;
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
        defaultValue={defaultValue}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function formatTicketStatus(status: string): string {
  const labels: Record<string, string> = {
    CLOSED: "Fechado",
    IN_PROGRESS: "Em atendimento",
    OPEN: "Aberto",
    RESOLVED: "Resolvido"
  };

  return labels[status] ?? status;
}
