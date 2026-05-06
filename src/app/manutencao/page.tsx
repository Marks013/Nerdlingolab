import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { Clock3, Mail, ShieldCheck, Sparkles, Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manutencao programada | NerdLingoLab",
  description: "A NerdLingoLab esta em manutencao programada para liberar melhorias na loja.",
  robots: {
    follow: false,
    index: false
  }
};

const defaultMessage =
  "Estamos ajustando a loja para deixar pedidos, pagamentos, cupons e entregas mais estaveis.";

export default function MaintenancePage() {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || "nerdlingolab@gmail.com";
  const customMessage = process.env.MAINTENANCE_MESSAGE?.trim();
  const message = customMessage || defaultMessage;

  return (
    <main className="geek-page flex min-h-dvh items-center px-5 py-10 text-[#111827]">
      <section className="mx-auto grid w-full max-w-[1180px] overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-between bg-[#ff6902] p-7 text-white sm:p-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-[#7c1fe6] shadow-sm">
              <Wrench className="size-4" aria-hidden="true" />
              Modo manutencao ativo
            </div>

            <h1 className="mt-8 max-w-[12ch] text-balance text-4xl font-black leading-tight sm:text-5xl">
              Laboratorio em ajustes.
            </h1>

            <p className="mt-5 max-w-[36rem] text-pretty text-base font-medium leading-7 text-white/90">
              {message}
            </p>
          </div>

          <div className="mt-10 rounded-lg border border-white/30 bg-white/15 p-5">
            <p className="text-sm font-black uppercase text-white/80">NerdLingoLab</p>
            <p className="mt-2 text-pretty text-sm leading-6 text-white/90">
              Se voce ja fez um pedido, ele continua seguro. Durante a manutencao, a equipe tecnica
              prioriza integridade de estoque, checkout e frete.
            </p>
          </div>
        </div>

        <div className="relative bg-[#fbfbfd] p-7 sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-[#ff6902]">Voltamos em breve</p>
              <h2 className="mt-2 text-balance text-3xl font-black text-[#7c1fe6]">
                Loja pausada para uma entrega melhor.
              </h2>
            </div>

            <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
              <Image
                src="/brand-assets/FAVICON_NERDLINGOLAB.webp"
                alt="Mascote NerdLingoLab"
                fill
                sizes="96px"
                className="object-contain p-3"
                priority
              />
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <StatusCard
              icon={<ShieldCheck className="size-5" aria-hidden="true" />}
              title="Pedidos"
              text="Historico e pagamentos preservados."
            />
            <StatusCard
              icon={<Clock3 className="size-5" aria-hidden="true" />}
              title="Retorno"
              text="Atualizacao em janela curta."
            />
            <StatusCard
              icon={<Sparkles className="size-5" aria-hidden="true" />}
              title="Melhorias"
              text="Build, migracoes e smoke test."
            />
          </div>

          <div className="mt-8 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-[#111827]">Precisa falar com a equipe?</p>
            <a
              href={`mailto:${supportEmail}`}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#ff6902]/30 bg-[#fff7ed] px-4 py-2 text-sm font-black text-[#9a3412] shadow-sm hover:bg-[#ffedd5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6902]"
            >
              <Mail className="size-4" aria-hidden="true" />
              {supportEmail}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusCard({
  icon,
  text,
  title
}: {
  icon: ReactNode;
  text: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex size-10 items-center justify-center rounded-lg bg-[#f5f3ff] text-[#7c1fe6]">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-black text-[#111827]">{title}</h3>
      <p className="mt-2 text-pretty text-sm leading-6 text-[#5f6773]">{text}</p>
    </div>
  );
}
