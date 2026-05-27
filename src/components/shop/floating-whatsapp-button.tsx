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

      <div className="flex flex-col items-center gap-3">
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
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35ZM12.05 2a9.95 9.95 0 0 0-8.49 15.14L2.4 21.4l4.36-1.14A9.93 9.93 0 0 0 12.05 22h.01A10 10 0 0 0 12.05 2Zm.01 18.31h-.01a8.25 8.25 0 0 1-4.2-1.15l-.3-.18-2.59.68.69-2.52-.2-.32a8.3 8.3 0 1 1 6.61 3.49Z"
      />
    </svg>
  );
}
