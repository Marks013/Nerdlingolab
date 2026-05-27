import Image from "next/image";
import { MessageCircle } from "lucide-react";

const chibbyGreeting = "Chibby: Eaeee!";
const chibbyImageSrc = "/brand-assets/chibby-chatbox-avatar.webp";
const whatsappMessage = "Olá! Vim pelo site da NerdLingoLab e gostaria de atendimento.";
const whatsappHref = `https://wa.me/5544991362488?text=${encodeURIComponent(whatsappMessage)}`;

export function FloatingWhatsappButton(): React.ReactElement {
  return (
    <a
      aria-label="Falar com a NerdLingoLab pelo WhatsApp"
      className="group fixed bottom-20 right-3 z-50 flex w-14 flex-col items-center gap-2 text-slate-950 focus-visible:outline-none sm:bottom-8 sm:right-5 sm:w-16"
      href={whatsappHref}
      rel="noreferrer"
      target="_blank"
    >
      <span className="absolute bottom-[calc(100%+0.5rem)] right-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-center text-xs font-black shadow-[0_12px_26px_rgba(15,23,42,0.14)] ring-1 ring-black/10 after:absolute after:-bottom-1 after:right-6 after:h-2 after:w-2 after:rotate-45 after:bg-white sm:text-sm">
        {chibbyGreeting}
      </span>
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
    </a>
  );
}
