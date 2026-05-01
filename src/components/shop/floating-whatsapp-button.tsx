import { MessageCircle } from "lucide-react";

const whatsappHref = "https://wa.me/5544991362488";

export function FloatingWhatsappButton(): React.ReactElement {
  return (
    <a
      aria-label="Falar com a NerdLingoLab pelo WhatsApp"
      className="fixed right-3 top-1/2 z-50 inline-flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_10px_28px_rgba(37,211,102,0.35)] transition hover:-translate-y-[52%] hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25d366]/30 sm:right-5 sm:h-16 sm:w-16"
      href={whatsappHref}
      rel="noreferrer"
      target="_blank"
    >
      <MessageCircle className="h-7 w-7 sm:h-8 sm:w-8" />
    </a>
  );
}
