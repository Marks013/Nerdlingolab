"use client";

import Image from "next/image";
import { MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";

const chibbyGreeting = "Chibby: Eaaeee!";
const chibbyImageSrc = "/brand-assets/chibby-chatbox-avatar.webp";
const whatsappMessage = "Olá! Vim pelo site da NerdLingoLab e gostaria de atendimento.";
const whatsappHref = `https://wa.me/5544991362488?text=${encodeURIComponent(whatsappMessage)}`;
const chatboxId = "chibby-chatbox";

export function FloatingWhatsappButton(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-3 z-[90] flex w-[min(calc(100vw-1.5rem),22rem)] flex-col items-end gap-3 text-slate-950 sm:bottom-8 sm:right-5">
      {isOpen ? (
        <section
          aria-label="Chat do Chibby"
          className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_20px_52px_rgba(15,23,42,0.18)]"
          id={chatboxId}
        >
          <header className="flex items-center gap-3 border-b border-slate-100 bg-[#122325] px-4 py-3 text-white">
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-white/80">
              <Image
                alt="Chibby"
                className="h-full w-full object-cover"
                height={96}
                sizes="44px"
                src={chibbyImageSrc}
                width={96}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black leading-5">Chibby</p>
              <p className="text-xs font-semibold leading-5 text-white/70">Atendimento NerdLingoLab</p>
            </div>
            <button
              aria-label="Fechar chat do Chibby"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="space-y-3 bg-[linear-gradient(135deg,#fff_0%,#f8fafc_100%)] p-4">
            <div className="max-w-[18rem] rounded-lg rounded-tl-sm bg-white px-4 py-3 text-sm font-semibold leading-6 shadow-sm ring-1 ring-slate-200">
              Oi! Eu sou o Chibby, o ajudante da NerdLingoLab.
            </div>
            <div className="max-w-[18rem] rounded-lg rounded-tl-sm bg-white px-4 py-3 text-sm leading-6 shadow-sm ring-1 ring-slate-200">
              Como posso te ajudar hoje? Posso chamar nosso atendimento para falar sobre produtos, pedidos, cupons ou
              entregas.
            </div>
            <a
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#25d366] px-4 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(37,211,102,0.28)] transition hover:-translate-y-0.5 hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25d366]/30"
              href={whatsappHref}
              rel="noreferrer"
              target="_blank"
            >
              <Send className="h-4 w-4" />
              Continuar no WhatsApp
            </a>
          </div>
        </section>
      ) : null}

      <button
        aria-controls={chatboxId}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Fechar chat do Chibby" : "Abrir chat do Chibby"}
        className="group relative flex w-16 flex-col items-center gap-2 focus-visible:outline-none sm:w-20"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        {!isOpen ? (
          <span className="absolute bottom-[calc(100%+0.5rem)] right-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-center text-xs font-black shadow-[0_12px_26px_rgba(15,23,42,0.14)] ring-1 ring-black/10 after:absolute after:-bottom-1 after:right-6 after:h-2 after:w-2 after:rotate-45 after:bg-white sm:text-sm">
            {chibbyGreeting}
          </span>
        ) : null}
        <span className="relative h-14 w-14 overflow-hidden rounded-full bg-white shadow-[0_10px_24px_rgba(255,91,0,0.22)] ring-2 ring-white transition group-hover:-translate-y-1 sm:h-16 sm:w-16">
          <Image
            alt="Chibby"
            className="h-full w-full object-cover"
            height={128}
            sizes="(min-width: 640px) 64px, 56px"
            src={chibbyImageSrc}
            width={128}
          />
        </span>
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_10px_28px_rgba(37,211,102,0.35)] transition group-hover:-translate-y-1 group-hover:bg-[#1ebe5d] group-focus-visible:ring-4 group-focus-visible:ring-[#25d366]/30 sm:h-16 sm:w-16">
          <MessageCircle className="h-7 w-7 sm:h-8 sm:w-8" />
        </span>
      </button>
    </div>
  );
}
