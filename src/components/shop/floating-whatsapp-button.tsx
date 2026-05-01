import { MessageCircle } from "lucide-react";

const whatsappMessage = "Olá! Vim pelo site da NerdLingoLab e gostaria de atendimento.";
const whatsappHref = `https://wa.me/5544991362488?text=${encodeURIComponent(whatsappMessage)}`;

export function FloatingWhatsappButton(): React.ReactElement {
  return (
    <a
      aria-label="Falar com a NerdLingoLab pelo WhatsApp"
      className="fixed bottom-20 right-3 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_10px_28px_rgba(37,211,102,0.35)] transition hover:-translate-y-1 hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25d366]/30 sm:bottom-8 sm:right-5 sm:h-16 sm:w-16"
      href={whatsappHref}
      rel="noreferrer"
      target="_blank"
    >
      <MessageCircle className="h-7 w-7 sm:h-8 sm:w-8" />
    </a>
  );
}
