"use client";

import { MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface SupportReplyItem {
  createdAt: string;
  deliveryStatus: string;
  id: string;
  message: string;
}

interface SupportTicketItem {
  createdAt: string;
  rating: number | null;
  replies: SupportReplyItem[];
  status: string;
  subjectLabel: string;
  ticketId: string;
}

interface SupportHistoryResponse {
  tickets: SupportTicketItem[];
}

const seenRepliesStorageKey = "nerdlingolab:support-seen-replies";
const pollingIntervalMs = 60_000;
const replyNoticeFreshnessMs = 14 * 24 * 60 * 60 * 1000;

export function SupportReplyNotifier(): React.ReactElement | null {
  const pathname = usePathname();
  const [ticket, setTicket] = useState<SupportTicketItem | null>(null);

  const latestReplyId = useMemo(() => ticket?.replies.at(-1)?.id ?? null, [ticket]);
  const shouldPoll = pathname ? !pathname.startsWith("/admin") : true;

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function loadSupportReplies(): Promise<void> {
      try {
        const response = await fetch("/api/support", {
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json() as SupportHistoryResponse;
        const unseenTicket = payload.tickets.find((item) => {
          if (item.rating) {
            return false;
          }

          const latestReply = item.replies.at(-1);
          const replyId = latestReply?.id;

          return replyId && latestReply
            ? !getSeenReplies().has(replyId) && isFreshReply(latestReply.createdAt)
            : false;
        });

        if (isMounted) {
          setTicket(unseenTicket ?? null);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setTicket(null);
        }
      }
    }

    void loadSupportReplies();
    const intervalId = window.setInterval(() => void loadSupportReplies(), pollingIntervalMs);

    return () => {
      isMounted = false;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [shouldPoll]);

  if (!shouldPoll || !ticket || !latestReplyId) {
    return null;
  }

  function dismissNotice(): void {
    if (latestReplyId) {
      markReplyAsSeen(latestReplyId);
    }

    setTicket(null);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[80] w-[min(380px,calc(100vw-2rem))] rounded-lg border border-[#f1d5c3] bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-black">Seu suporte foi respondido</p>
          <p className="mt-1 text-sm leading-5 text-[#4f5d65]">
            Protocolo {ticket.ticketId}. Confira a resposta da equipe e avalie o atendimento quando estiver resolvido.
          </p>
          <Link
            className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            href={`/suporte#ticket-${ticket.ticketId}`}
            onClick={dismissNotice}
          >
            Ver resposta
          </Link>
        </div>
        <button
          aria-label="Fechar aviso de suporte"
          className="rounded-full p-1.5 text-[#4f5d65] transition hover:bg-[#f7f7f7] hover:text-black"
          onClick={dismissNotice}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
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

function markReplyAsSeen(replyId: string): void {
  const seenReplies = getSeenReplies();
  seenReplies.add(replyId);
  window.localStorage.setItem(seenRepliesStorageKey, JSON.stringify([...seenReplies]));
}

function isFreshReply(createdAt: string): boolean {
  const createdAtTime = new Date(createdAt).getTime();

  return Number.isFinite(createdAtTime) && Date.now() - createdAtTime <= replyNoticeFreshnessMs;
}
