import { Headphones, LockKeyhole, PackageCheck, RotateCcw, ShieldCheck, ShoppingCart } from "lucide-react";
import Link from "next/link";

const categories = [
  { href: "/produtos", label: "Todos nossos produtos" },
  { href: "/produtos?ordem=recentes", label: "Mais Vendidos" },
  { href: "/produtos?categoria=temporada", label: "Temporadas" },
  { href: "/produtos?categoria=action-figures", label: "Action Figures" }
];

const institutional = [
  { href: "/", label: "Página inicial" },
  { href: "/suporte", label: "Entrar em contato" },
  { href: "/suporte", label: "Rastrear meu Pedido" },
  { href: "/termos", label: "Termos de Uso" },
  { href: "/privacidade", label: "Política Privacidade" }
];

const paymentBadges = [
  { label: "Mastercard", mark: "●●", className: "bg-[#231f20] text-[#f79e1b]" },
  { label: "Visa", mark: "VISA", className: "bg-[#1434cb] text-white" },
  { label: "Elo", mark: "elo", className: "bg-black text-white" },
  { label: "Hipercard", mark: "H", className: "bg-[#b3131b] text-white" },
  { label: "American Express", mark: "AMEX", className: "bg-[#2e77bc] text-white" },
  { label: "Diners Club", mark: "DC", className: "bg-[#0079be] text-white" },
  { label: "Boleto", mark: "▥", className: "bg-white text-black" },
  { label: "Pix", mark: "pix", className: "bg-[#178c80] text-white" }
];

const serviceItems = [
  {
    icon: PackageCheck,
    title: "Entrega acompanhada",
    description: "Receba seu pedido no conforto da sua casa com entrega garantida e segurada pelos Correios."
  },
  {
    icon: ShoppingCart,
    title: "Devolução ou Reembolso",
    description: "Caso haja algo, devolvemos seu dinheiro com velocidade"
  },
  {
    icon: Headphones,
    title: "Precisa de atendimento?",
    description: "Equipe de suporte de extrema qualidade a semana toda"
  },
  {
    icon: LockKeyhole,
    title: "Pagamento seguro",
    description: "Ambiente seguro para pagamentos online"
  }
];

export function ShopFooter(): React.ReactElement {
  return (
    <footer className="bg-white text-black">
      <section className="bg-primary text-white">
        <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-5 py-8 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
          {serviceItems.map((item) => (
            <div className="flex items-start gap-5" key={item.title}>
              <item.icon className="mt-1 h-11 w-11 shrink-0 stroke-[1.8]" />
              <div>
                <h3 className="text-base font-bold">{item.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-5">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-10 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.9fr_1.1fr] lg:px-10">
        <div>
          <h2 className="text-sm font-black uppercase">Atendimento ao Consumidor</h2>
          <div className="mt-6 space-y-3 text-base">
            <p>
              <strong>E-mail:</strong> nerdlingolab@gmail.com
            </p>
            <p>
              <strong>WhatsApp:</strong> (44) 99136-2488
            </p>
          </div>
          <h2 className="mt-9 text-sm font-black uppercase">Horário de atendimento</h2>
          <div className="mt-5 space-y-2 text-base">
            <p>Seg a Sex: 08:00hs às 22:00hs</p>
            <p>Sábado e feriados: 08:00hs às 20:00hs</p>
          </div>
        </div>

        <FooterColumn links={categories} title="Categorias" />
        <FooterColumn links={institutional} title="Institucional" />

        <div>
          <h2 className="text-sm font-black uppercase">Receba nossas promoções</h2>
          <p className="mt-6 max-w-sm text-base leading-7">
            Inscreva-se para receber descontos exclusivos direto no seu e-mail!
          </p>
          <form className="mt-6 grid gap-3">
            <label className="sr-only" htmlFor="footer-email">Newsletter</label>
            <input
              className="h-12 rounded-lg border border-[#e5e5e5] px-4 text-sm outline-none transition focus:border-primary"
              id="footer-email"
              placeholder="Seu e-mail"
              type="email"
            />
            <button className="h-12 rounded-lg bg-primary px-5 text-sm font-bold text-white" type="button">
              Enviar
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-5 pb-8 sm:px-8 lg:px-10">
        <p className="text-sm leading-6 text-[#344049]">
          Oferta exclusiva neste site oficial, sujeita a variação. Evite comprar produtos mais baratos ou de outras lojas,
          para evitar golpes. <strong>Não nos responsabilizamos por problemas em compras fora deste site.</strong>
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            aria-label="Instagram NerdLingoLab"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-105 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            href="https://instagram.com/nerdlingolab"
          >
            <InstagramLogo />
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1440px] gap-8 px-5 pb-10 sm:px-8 md:grid-cols-2 lg:px-10">
        <div>
          <h2 className="text-sm font-semibold">Segurança e Qualidade</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <SecurityBadge href="https://safeweb.norton.com/" icon={ShieldCheck} label="Norton Secured" tone="bg-[#ffd400] text-black" />
            <SecurityBadge href="https://www.reclameaqui.com.br/" icon={RotateCcw} label="ReclameAQUI" tone="bg-[#77bd1f] text-white" />
            <SecurityBadge href="https://transparencyreport.google.com/safe-browsing/search" icon={ShieldCheck} label="Google Site Seguro" tone="bg-white text-[#1a73e8]" />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Nós aceitamos</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {paymentBadges.map((badge) => (
              <span
                aria-label={badge.label}
                className={`inline-flex h-9 min-w-14 items-center justify-center rounded-md border px-3 text-xs font-black uppercase shadow-sm ${badge.className}`}
                key={badge.label}
                title={badge.label}
              >
                {badge.mark}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-[#e8e8e8] py-2 text-center text-xs text-[#677279]">
        Segurança desenvolvida & certificada pela Ímã Digital ©.
      </div>
    </footer>
  );
}

function InstagramLogo(): React.ReactElement {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <rect height="17" rx="5" stroke="currentColor" strokeWidth="2" width="17" x="3.5" y="3.5" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.25" cy="6.75" fill="currentColor" r="1.25" />
    </svg>
  );
}

function FooterColumn({
  links,
  title
}: {
  links: Array<{ href: string; label: string }>;
  title: string;
}): React.ReactElement {
  return (
    <nav aria-label={title === "Categorias" ? "Coleções do rodapé" : `${title} do rodapé`}>
      <h2 className="text-sm font-black uppercase">{title}</h2>
      <ul className="mt-6 grid gap-4 text-base">
        {links.map((link) => (
          <li key={link.label}>
            <Link className="underline-offset-4 transition hover:translate-x-0.5 hover:text-primary hover:underline" href={link.href}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SecurityBadge({
  href,
  icon: Icon,
  label,
  tone
}: {
  href: string;
  icon: typeof ShieldCheck;
  label: string;
  tone: string;
}): React.ReactElement {
  return (
    <Link className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-xs font-bold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${tone}`} href={href}>
      <Icon className="h-5 w-5 transition group-hover:scale-110" />
      {label}
    </Link>
  );
}
