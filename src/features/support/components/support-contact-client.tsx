"use client";

import { CheckCircle2, History, MessageCircle, RefreshCw, Send, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  supportSubjectLabels,
  supportSubjects,
  type SupportRequestInput
} from "@/lib/support/schema";

interface SupportReplyItem {
  createdAt: string;
  deliveryStatus: string;
  id: string;
  message: string;
}

interface SupportHistoryItem {
  createdAt: string;
  message?: string;
  ratedAt?: string | null;
  rating?: number | null;
  ratingComment?: string | null;
  replies?: SupportReplyItem[];
  reopenCount?: number;
  status?: string;
  subject: string;
  ticketId: string;
}

interface SupportHistoryResponse {
  tickets: Array<{
    createdAt: string;
    message: string;
    ratedAt: string | null;
    rating: number | null;
    ratingComment: string | null;
    replies: SupportReplyItem[];
    reopenCount: number;
    status: string;
    subjectLabel: string;
    ticketId: string;
  }>;
}

interface SupportContactClientProps {
  initialEmail?: string;
  initialName?: string;
}

const historyStorageKey = "nerdlingolab:support-history";
const seenRepliesStorageKey = "nerdlingolab:support-seen-replies";

export function SupportContactClient({
  initialEmail = "",
  initialName = ""
}: SupportContactClientProps): React.ReactElement {
  const [history, setHistory] = useState<SupportHistoryItem[]>(() => loadHistory());
  const [message, setMessage] = useState<string | null>(null);
  const [noticeTicket, setNoticeTicket] = useState<SupportHistoryItem | null>(null);
  const [status, setStatus] = useState<"error" | "idle" | "sending" | "success">("idle");

  const latestReplyByTicket = useMemo(() => {
    const entries = history
      .map((ticket) => [ticket.ticketId, ticket.replies?.at(-1)?.id] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));

    return new Map(entries);
  }, [history]);

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
          ratedAt: ticket.ratedAt,
          rating: ticket.rating,
          ratingComment: ticket.ratingComment,
          replies: ticket.replies,
          reopenCount: ticket.reopenCount,
          status: ticket.status,
          subject: ticket.subjectLabel,
          ticketId: ticket.ticketId
        }));

        if (!isMounted || tickets.length === 0) {
          return;
        }

        setHistory(tickets);
        const unseenTicket = tickets.find((ticket) => {
          const latestReplyId = ticket.replies.at(-1)?.id;

          return latestReplyId ? !getSeenReplies().has(latestReplyId) : false;
        });

        if (unseenTicket) {
          setNoticeTicket(unseenTicket);
        }
      } catch {
        // Local protocol history remains available even when account history cannot be loaded.
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
      const responseBody = await response.json() as { message?: string; ticketId?: string };

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
      window.localStorage.setItem(historyStorageKey, JSON.stringify(nextHistory));
      setMessage(`${responseBody.message ?? "Mensagem registrada."} Protocolo ${responseBody.ticketId}.`);
      setStatus("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar sua mensagem agora.");
      setStatus("error");
    }
  }

  async function rateTicket(ticketId: string, rating: number, comment: string): Promise<void> {
    const response = await fetch(`/api/support/${ticketId}/rating`, {
      body: JSON.stringify({ comment, rating }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const payload = await response.json() as { message?: string };

    if (!response.ok) {
      setMessage(payload.message ?? "Não foi possível avaliar o atendimento.");
      setStatus("error");
      return;
    }

    setHistory((current) => current.map((ticket) => (
      ticket.ticketId === ticketId
        ? { ...ticket, ratedAt: new Date().toISOString(), rating, ratingComment: comment }
        : ticket
    )));
    setMessage(payload.message ?? "Obrigado pela avaliacao.");
    setStatus("success");
  }

  async function reopenTicket(ticketId: string, reason: string): Promise<void> {
    const response = await fetch(`/api/support/${ticketId}/reopen`, {
      body: JSON.stringify({ reason }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const payload = await response.json() as { message?: string };

    if (!response.ok) {
      setMessage(payload.message ?? "Não foi possível reabrir o atendimento.");
      setStatus("error");
      return;
    }

    setHistory((current) => current.map((ticket) => (
      ticket.ticketId === ticketId
        ? { ...ticket, ratedAt: null, rating: null, reopenCount: (ticket.reopenCount ?? 0) + 1, status: "OPEN" }
        : ticket
    )));
    setMessage(payload.message ?? "Protocolo reaberto com sucesso.");
    setStatus("success");
  }

  function dismissNotice(): void {
    if (!noticeTicket) {
      return;
    }

    const latestReplyId = latestReplyByTicket.get(noticeTicket.ticketId);

    if (latestReplyId) {
      const seenReplies = getSeenReplies();
      seenReplies.add(latestReplyId);
      window.localStorage.setItem(seenRepliesStorageKey, JSON.stringify([...seenReplies]));
    }

    setNoticeTicket(null);
  }

  const activeTickets = history.filter(isActiveSupportTicket);
  const finishedTickets = history.filter((ticket) => !isActiveSupportTicket(ticket));

  return (
    <>
      {noticeTicket ? <SupportReplyNotice onClose={dismissNotice} ticket={noticeTicket} /> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
        <form action={submitSupport} className="rounded-lg bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-2xl font-black text-black">Envie sua mensagem</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field defaultValue={initialName} label="Seu nome *" name="name" required />
            <Field defaultValue={initialEmail} label="Seu e-mail *" name="email" required type="email" />
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
            Sua mensagem *
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
            {status === "sending" ? "Enviando..." : "Enviar mensagem"}
          </button>
        </form>

        <aside className="rounded-lg bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-black text-black">Acompanhamento de suporte</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#4f5d65]">
            Protocolos em aberto ou respondidos ficam destacados. Atendimentos avaliados ficam no historico.
          </p>

          {activeTickets.length > 0 ? (
            <section className="mt-5 rounded-lg border border-[#ffd6bd] bg-[#fff8f3] p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-black text-black">Em atendimento</h3>
                  <p className="mt-1 text-xs font-semibold text-[#7a4c32]">
                    {activeTickets.length} protocolo{activeTickets.length === 1 ? "" : "s"} aguardando acompanhamento.
                  </p>
                </div>
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-black text-white">
                  Aberto
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {activeTickets.map((item) => (
                  <SupportTicketCard
                    item={item}
                    key={item.ticketId}
                    onRate={(rating, comment) => void rateTicket(item.ticketId, rating, comment)}
                    onReopen={(reason) => void reopenTicket(item.ticketId, reason)}
                    variant="featured"
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-black">Historico finalizado</h3>
              <span className="rounded-full border px-2 py-1 text-xs font-bold text-[#4f5d65]">
                {finishedTickets.length}
              </span>
            </div>
            <div className="mt-3 grid gap-3">
              {finishedTickets.length > 0 ? (
                finishedTickets.map((item) => (
                <SupportTicketCard
                  item={item}
                  key={item.ticketId}
                  onRate={(rating, comment) => void rateTicket(item.ticketId, rating, comment)}
                  onReopen={(reason) => void reopenTicket(item.ticketId, reason)}
                  variant="compact"
                />
                ))
              ) : activeTickets.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm leading-6 text-[#4f5d65]">
                  Nenhum protocolo aberto ainda.
                </p>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm leading-6 text-[#4f5d65]">
                  Os atendimentos avaliados aparecem aqui.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function SupportTicketCard({
  item,
  onRate,
  onReopen,
  variant = "compact"
}: {
  item: SupportHistoryItem;
  onRate: (rating: number, comment: string) => void;
  onReopen: (reason: string) => void;
  variant?: "compact" | "featured";
}): React.ReactElement {
  const [ratingComment, setRatingComment] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const canReopen = !item.rating && (item.status === "RESOLVED" || item.status === "CLOSED");
  const hasReplies = Boolean(item.replies?.length);
  const isFeatured = variant === "featured";

  return (
    <div
      className={[
        "rounded-lg border bg-white",
        isFeatured ? "border-[#ffc39e] p-4 shadow-sm" : "border-[#eeeeee] p-3"
      ].join(" ")}
      id={`ticket-${item.ticketId}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={isFeatured ? "text-base font-black text-black" : "text-sm font-black text-black"}>{item.ticketId}</p>
          <p className="mt-1 text-sm text-[#4f5d65]">{item.subject}</p>
        </div>
        {item.status ? (
          <span className={isFeatured ? "rounded-full bg-primary px-3 py-1 text-xs font-black text-white" : "rounded-full border px-2 py-1 text-[11px] font-bold text-[#4f5d65]"}>
            {formatTicketStatus(item.status)}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs font-semibold text-[#677279]">{formatLocalDate(item.createdAt)}</p>
      {item.message ? (
        <p className={isFeatured ? "mt-3 whitespace-pre-line rounded-lg border border-[#f4e1d6] bg-[#fffaf6] p-3 text-sm leading-6 text-[#4f5d65]" : "mt-3 line-clamp-3 text-sm leading-6 text-[#4f5d65]"}>
          {item.message}
        </p>
      ) : null}
      {hasReplies ? (
        <div className="mt-3 grid gap-2">
          {item.replies?.map((reply) => (
            <div className={isFeatured ? "rounded-lg border border-[#f0d6c6] bg-white p-3" : "rounded-lg bg-[#f7f7f7] p-3"} key={reply.id}>
              <p className="flex items-center gap-2 text-xs font-black text-black">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
                Resposta da equipe
              </p>
              <p className="mt-1 text-xs font-semibold text-[#677279]">{formatLocalDate(reply.createdAt)}</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#4f5d65]">{reply.message}</p>
            </div>
          ))}
          <div className="rounded-lg border border-[#eeeeee] p-3">
            {item.rating ? (
              <p className="flex items-center gap-2 text-sm font-bold text-[#176c35]">
                <CheckCircle2 className="h-4 w-4" />
                Atendimento avaliado com {item.rating}/5
              </p>
            ) : (
              <div className="grid gap-2">
                <p className="text-sm font-black text-black">Avalie o atendimento</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      className="inline-flex h-9 items-center gap-1 rounded-full border px-3 text-sm font-bold text-black transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                      key={rating}
                      disabled={rating < 4 && ratingComment.trim().length < 10}
                      onClick={() => onRate(rating, ratingComment)}
                      type="button"
                    >
                      <Star className="h-3.5 w-3.5" />
                      {rating}
                    </button>
                  ))}
                </div>
                <textarea
                  className="min-h-20 rounded-lg border border-[#d9e0e4] px-3 py-2 text-sm outline-none focus:border-primary"
                  maxLength={600}
                  onChange={(event) => setRatingComment(event.target.value)}
                  placeholder="Comentario opcional. Obrigatorio para notas abaixo de 4."
                  value={ratingComment}
                />
                <p className="text-xs text-[#677279]">
                  Ao avaliar, o protocolo fica encerrado e não poderá ser reaberto.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
      {canReopen ? (
        <details className="mt-3 rounded-lg border border-[#eeeeee] p-3">
          <summary className="cursor-pointer text-sm font-black text-black">Reabrir protocolo</summary>
          <textarea
            className="mt-3 min-h-20 w-full rounded-lg border border-[#d9e0e4] px-3 py-2 text-sm outline-none focus:border-primary"
            maxLength={800}
            minLength={10}
            onChange={(event) => setReopenReason(event.target.value)}
            placeholder="Conte o que ainda precisa ser resolvido."
            value={reopenReason}
          />
          <button
            className="mt-2 inline-flex h-10 items-center rounded-lg border px-3 text-sm font-black text-black transition hover:border-primary hover:text-primary disabled:opacity-50"
            disabled={reopenReason.trim().length < 10}
            onClick={() => onReopen(reopenReason)}
            type="button"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reabrir
          </button>
        </details>
      ) : null}
    </div>
  );
}

function isActiveSupportTicket(ticket: SupportHistoryItem): boolean {
  const hasReplies = Boolean(ticket.replies?.length);

  return !ticket.rating && (ticket.status === "OPEN" || ticket.status === "IN_PROGRESS" || hasReplies);
}

function SupportReplyNotice({
  onClose,
  ticket
}: {
  onClose: () => void;
  ticket: SupportHistoryItem;
}): React.ReactElement {
  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-[#f1d5c3] bg-white p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-black">Seu suporte foi respondido</p>
          <p className="mt-1 text-sm leading-5 text-[#4f5d65]">
            Protocolo {ticket.ticketId}. Veja a resposta no historico e avalie o atendimento.
          </p>
          <a
            className="mt-3 inline-flex text-sm font-black text-primary hover:underline"
            href={`#ticket-${ticket.ticketId}`}
            onClick={onClose}
          >
            Ver resposta
          </a>
        </div>
        <button aria-label="Fechar aviso de suporte" className="rounded-full p-1 text-[#4f5d65] hover:bg-[#f7f7f7]" onClick={onClose} type="button">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function loadHistory(): SupportHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedHistory = window.localStorage.getItem(historyStorageKey);

    return storedHistory ? JSON.parse(storedHistory) as SupportHistoryItem[] : [];
  } catch {
    return [];
  }
}

function getSeenReplies(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const value = window.localStorage.getItem(seenRepliesStorageKey);
    const parsedValue = value ? JSON.parse(value) : [];

    return new Set(Array.isArray(parsedValue) ? parsedValue.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set();
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

function formatLocalDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
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
