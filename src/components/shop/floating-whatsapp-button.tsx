"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const chibbyGreeting = "Chibby: Eaaeee!";
const chibbyImageSrc = "/brand-assets/chibby-chatbox-avatar.webp";
const whatsappMessage = "Olá! Vim pelo site da NerdLingoLab e gostaria de atendimento.";
const whatsappHref = `https://wa.me/5544991362488?text=${encodeURIComponent(whatsappMessage)}`;
const chatboxId = "chibby-chatbox";

export function FloatingWhatsappButton(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);

  useEffect(() => {
    const greetingTimer = window.setTimeout(() => setShowGreeting(false), 6500);

    return () => window.clearTimeout(greetingTimer);
  }, []);

  return (
    <div className="fixed bottom-20 right-3 z-[90] flex w-[min(calc(100vw-1.5rem),22rem)] flex-col items-end gap-3 text-slate-950 sm:bottom-8 sm:right-5">
      {isOpen ? (
        <section
          aria-label="Chat do Chibby"
          className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_20px_52px_rgba(15,23,42,0.18)]"
          id={chatboxId}
        >
          <header className="flex items-center gap-3 border-b border-orange-300/50 bg-[#ff6902] px-4 py-3 text-white">
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
              <WhatsappMark className="h-5 w-5" />
              Continuar no WhatsApp
            </a>
          </div>
        </section>
      ) : null}

      <div className="flex items-end gap-3">
        <button
          aria-controls={chatboxId}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Fechar chat do Chibby" : "Abrir chat do Chibby"}
          className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-[#ff6902] p-1.5 shadow-[0_14px_34px_rgba(255,105,2,0.34)] transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ff6902]/30 sm:h-[4.5rem] sm:w-[4.5rem]"
          onClick={() => {
            setShowGreeting(false);
            setIsOpen((currentValue) => !currentValue);
          }}
          type="button"
        >
          {showGreeting && !isOpen ? (
            <span className="absolute bottom-[calc(100%+0.55rem)] right-0 whitespace-nowrap rounded-full bg-[#ff6902] px-3 py-1.5 text-center text-xs font-black text-white shadow-[0_12px_26px_rgba(255,105,2,0.22)] ring-1 ring-white/35 after:absolute after:-bottom-1 after:right-6 after:h-2 after:w-2 after:rotate-45 after:bg-[#ff6902] sm:text-sm">
              {chibbyGreeting}
            </span>
          ) : null}
          <span className="relative h-full w-full overflow-hidden rounded-full bg-white ring-2 ring-white transition group-hover:scale-[1.03]">
            <Image
              alt="Chibby"
              className="h-full w-full object-cover"
              height={128}
              sizes="(min-width: 640px) 60px, 52px"
              src={chibbyImageSrc}
              width={128}
            />
          </span>
        </button>

        <a
          aria-label="Falar pelo WhatsApp"
          className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_14px_34px_rgba(37,211,102,0.35)] transition hover:-translate-y-1 hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25d366]/30 sm:h-[4.5rem] sm:w-[4.5rem]"
          href={whatsappHref}
          rel="noreferrer"
          target="_blank"
        >
          <WhatsappMark className="h-8 w-8 sm:h-9 sm:w-9" />
        </a>
      </div>
    </div>
  );
}

function WhatsappMark({ className }: { className?: string }): React.ReactElement {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5.3 26.7 6.8 21A11.1 11.1 0 1 1 11.2 25l-5.9 1.7Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.6"
      />
      <path
        d="M12.1 10.7c-.3-.7-.6-.7-.9-.7h-.8c-.3 0-.8.1-1.2.6-.4.4-1.5 1.4-1.5 3.5s1.5 4.1 1.7 4.4c.2.3 3 4.7 7.4 6.3 3.7 1.5 4.4 1.2 5.2 1.1.8-.1 2.6-1.1 2.9-2.1.4-1 .4-1.9.3-2.1-.1-.2-.4-.3-.9-.6l-2.8-1.4c-.4-.2-.8-.3-1.1.3-.3.4-1.1 1.3-1.4 1.6-.3.3-.5.3-1 .1-.5-.3-2-.7-3.8-2.4-1.4-1.2-2.4-2.8-2.6-3.3-.3-.5 0-.7.2-1 .2-.2.5-.5.7-.8.2-.3.3-.5.5-.8.1-.3.1-.6 0-.8l-.9-2Z"
        fill="currentColor"
      />
    </svg>
  );
}
