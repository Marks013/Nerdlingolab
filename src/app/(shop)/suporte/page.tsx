import { Clock3, Headphones, Mail, MessageCircle, Share2, UsersRound } from "lucide-react";

import { SupportContactClient } from "@/features/support/components/support-contact-client";

export default function SupportPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-[#f6f7f8]">
      <section className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-5 sm:py-10">
        <p className="mb-5 text-sm text-[#4f5d65]">Pagina inicial › Suporte</p>
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-medium tracking-normal text-black sm:text-4xl">Entrar em contato</h1>
          <p className="mt-4 text-base leading-7 text-[#4f5d65]">
            Tem alguma dúvida sobre nossos produtos geek? Estamos aqui para ajudar.
          </p>
        </div>

        <div className="mt-8">
          <SupportContactClient />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <InfoCard icon={Mail} title="Email">nerdlingolab@gmail.com<br />Respondemos em até 24 horas úteis</InfoCard>
          <InfoCard icon={MessageCircle} title="WhatsApp">(44) 99136-2488<br />Seg a Sex: 9h às 18h</InfoCard>
          <InfoCard icon={Clock3} title="Horário de Atendimento">Segunda a Sexta: 8h às 22h<br />Sábado: 8h às 20h</InfoCard>
          <InfoCard icon={Share2} title="Redes Sociais">
            <span className="inline-flex items-center gap-3">
              <Share2 className="h-4 w-4" />
              <UsersRound className="h-4 w-4" />
            </span>
          </InfoCard>
        </div>

        <section className="mt-6 rounded-lg bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-black text-black">Perguntas Frequentes</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Faq title="Qual o prazo de entrega?">O prazo varia de 7 a 15 dias úteis dependendo da sua região.</Faq>
            <Faq title="Posso trocar meu produto?">Você tem até 7 dias após o recebimento para solicitar troca.</Faq>
            <Faq title="Quais formas de pagamento?">Aceitamos cartão de crédito, PIX, boleto e parcelamento em até 12x.</Faq>
          </div>
        </section>
      </section>
    </main>
  );
}

function InfoCard({
  children,
  icon: Icon,
  title
}: {
  children: React.ReactNode;
  icon: typeof Headphones;
  title: string;
}): React.ReactElement {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <Icon className="h-7 w-7 text-primary" />
      <h2 className="mt-4 font-black text-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#4f5d65]">{children}</p>
    </div>
  );
}

function Faq({ children, title }: { children: React.ReactNode; title: string }): React.ReactElement {
  return (
    <div className="rounded-lg border border-[#eeeeee] p-4">
      <h3 className="font-black text-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4f5d65]">{children}</p>
    </div>
  );
}
