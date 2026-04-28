import { Headphones, LockKeyhole, PackageCheck, ShoppingCart } from "lucide-react";
import Link from "next/link";

import { NewsletterForm } from "@/features/newsletter/components/newsletter-form";
import type { StorefrontThemeView } from "@/lib/theme/storefront";

const categories = [
  { href: "/produtos", label: "Todos nossos produtos" },
  { href: "/#mais-vendidos", label: "Mais Vendidos" },
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

const paymentLogos = [
  { label: "Mastercard", Logo: MastercardLogo },
  { label: "Visa", Logo: VisaLogo },
  { label: "Elo", Logo: EloLogo },
  { label: "Hipercard", Logo: HipercardLogo },
  { label: "American Express", Logo: AmexLogo },
  { label: "Diners Club", Logo: DinersLogo },
  { label: "Boleto", Logo: BoletoLogo },
  { label: "Pix", Logo: PixLogo }
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

export function ShopFooter({
  theme
}: {
  theme: StorefrontThemeView;
}): React.ReactElement {
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
              <strong>E-mail:</strong> {theme.supportEmail}
            </p>
            <p>
              <strong>WhatsApp:</strong> {theme.whatsappLabel}
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
          <h2 className="text-sm font-black uppercase">{theme.newsletterTitle}</h2>
          <p className="mt-6 max-w-sm text-base leading-7">
            {theme.newsletterDescription}
          </p>
          <NewsletterForm />
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-5 pb-8 sm:px-8 lg:px-10">
        <p className="text-sm leading-6 text-[#344049]">
          {theme.footerNotice} <strong>Não nos responsabilizamos por problemas em compras fora deste site.</strong>
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            aria-label="Instagram NerdLingoLab"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-105 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            href={theme.instagramUrl}
          >
            <InstagramLogo />
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1440px] gap-8 px-5 pb-10 sm:px-8 md:grid-cols-2 lg:px-10">
        <div>
          <h2 className="text-sm font-semibold">Segurança e Qualidade</h2>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <SecurityLogoBadge href="https://safeweb.norton.com/" label="Norton Secured">
              <NortonLogo />
            </SecurityLogoBadge>
            <SecurityLogoBadge href="https://www.reclameaqui.com.br/" label="Reclame Aqui">
              <ReclameAquiLogo />
            </SecurityLogoBadge>
            <SecurityLogoBadge href="https://transparencyreport.google.com/safe-browsing/search" label="Google Safe Browsing">
              <GoogleSafeLogo />
            </SecurityLogoBadge>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Nós aceitamos</h2>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {paymentLogos.map((payment) => (
              <span
                aria-label={payment.label}
                className="payment-badge inline-flex h-10 w-[76px] items-center justify-center overflow-hidden rounded-md border border-[#d9e0e4] bg-white px-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                key={payment.label}
                role="img"
                title={payment.label}
              >
                <payment.Logo />
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

function MastercardLogo(): React.ReactElement {
  return (
    <svg aria-hidden="true" className="h-7 w-12" viewBox="0 0 64 40">
      <rect fill="white" height="40" rx="6" width="64" />
      <circle cx="26" cy="20" fill="#eb001b" r="13" />
      <circle cx="38" cy="20" fill="#f79e1b" r="13" />
      <path
        d="M32 9.2a13 13 0 0 1 0 21.6 13 13 0 0 1 0-21.6Z"
        fill="#ff5f00"
      />
    </svg>
  );
}

function VisaLogo(): React.ReactElement {
  return (
    <svg aria-hidden="true" className="h-7 w-14" viewBox="0 0 92 32">
      <rect fill="white" height="32" rx="5" width="92" />
      <path
        d="M36.1 8.2 28.8 24h-5.1L20.1 11.1c-.2-.8-.4-1.1-1.1-1.5-1.1-.6-2.8-1.1-4.4-1.4l.1-.5h8.2c1.1 0 2 .7 2.3 1.9l1.9 9.4 4.7-11.3h4.3Zm12.1 10.6c0-4.1-5.7-4.4-5.7-6.2 0-.6.6-1.2 1.8-1.3.6-.1 2.3-.1 4.3.8l.8-3.6c-1-.4-2.4-.8-4.1-.8-4.4 0-7.5 2.3-7.5 5.7 0 2.5 2.2 3.9 3.9 4.7 1.7.8 2.3 1.4 2.3 2.1 0 1.1-1.4 1.6-2.6 1.6-2.2 0-3.5-.6-4.5-1.1l-.8 3.7c1 .5 2.9.9 4.9 1 4.7 0 7.7-2.3 7.7-5.9Zm11.6 5.2h4.1L60.3 8.2h-3.8c-.9 0-1.6.5-1.9 1.3L47.7 24h4.7l1-2.8h5.7l.7 2.8Zm-5-6.2 2.4-6.6 1.4 6.6h-3.8ZM15.7 8.2 11.2 24H6.6L11 8.2h4.7Zm55.6 0L66.8 24h-4.6l4.4-15.8h4.7Z"
        fill="#1434cb"
      />
    </svg>
  );
}

function EloLogo(): React.ReactElement {
  return <PaymentWordmark color="#111827" label="elo" />;
}

function HipercardLogo(): React.ReactElement {
  return <PaymentWordmark color="#c51f32" label="Hipercard" />;
}

function AmexLogo(): React.ReactElement {
  return <PaymentWordmark color="#0072ce" label="AMEX" />;
}

function DinersLogo(): React.ReactElement {
  return <PaymentWordmark color="#0079be" label="Diners" />;
}

function BoletoLogo(): React.ReactElement {
  return (
    <svg aria-hidden="true" className="h-6 w-12" viewBox="0 0 64 32">
      <rect fill="#fff" height="32" rx="5" width="64" />
      <path d="M10 8h2v16h-2zm5 0h1v16h-1zm4 0h3v16h-3zm7 0h1v16h-1zm4 0h2v16h-2zm6 0h1v16h-1zm4 0h4v16h-4zm8 0h1v16h-1zm4 0h2v16h-2z" fill="#111827" />
      <text fill="#111827" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="700" x="9" y="30">Boleto</text>
    </svg>
  );
}

function PaymentWordmark({
  color,
  label
}: {
  color: string;
  label: string;
}): React.ReactElement {
  return (
    <svg aria-hidden="true" className="h-6 w-14" viewBox="0 0 72 32">
      <rect fill="white" height="32" rx="5" width="72" />
      <text
        fill={color}
        fontFamily="Arial, sans-serif"
        fontSize={label.length > 6 ? 10 : 14}
        fontStyle={label === "elo" ? "italic" : "normal"}
        fontWeight="900"
        textAnchor="middle"
        x="36"
        y="21"
      >
        {label}
      </text>
    </svg>
  );
}

function PixLogo(): React.ReactElement {
  return (
    <svg aria-hidden="true" className="h-7 w-14" viewBox="0 0 72 40">
      <rect fill="white" height="40" rx="6" width="64" />
      <path
        d="M26 7.2c2 0 3.9.8 5.3 2.2l7.5 7.5c1.7 1.7 1.7 4.5 0 6.2l-7.5 7.5a7.5 7.5 0 0 1-10.6 0l-7.5-7.5a4.4 4.4 0 0 1 0-6.2l7.5-7.5A7.5 7.5 0 0 1 26 7.2Z"
        fill="#32bcad"
      />
      <path
        d="M18.8 17.1h3.4c.8 0 1.5.3 2.1.9l3 3c.4.4.9.4 1.3 0l3-3c.6-.6 1.3-.9 2.1-.9h3.5l-7.9-7.9a4.7 4.7 0 0 0-6.6 0l-7.9 7.9Zm18.4 5.8h-3.5c-.8 0-1.5-.3-2.1-.9l-3-3a.9.9 0 0 0-1.3 0l-3 3c-.6.6-1.3.9-2.1.9h-3.4l7.9 7.9a4.7 4.7 0 0 0 6.6 0l7.9-7.9Z"
        fill="#fff"
      />
      <text fill="#32bcad" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="900" x="45" y="24">Pix</text>
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

function SecurityLogoBadge({
  children,
  href,
  label
}: {
  children: React.ReactNode;
  href: string;
  label: string;
}): React.ReactElement {
  return (
    <Link
      aria-label={label}
      className="inline-flex h-10 min-w-[104px] items-center justify-center rounded-md border border-[#d9e0e4] bg-white px-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
      href={href}
      title={label}
    >
      {children}
    </Link>
  );
}

function NortonLogo(): React.ReactElement {
  return (
    <svg aria-hidden="true" className="h-8 w-[112px]" viewBox="0 0 140 40">
      <rect fill="#ffd400" height="40" rx="6" width="140" />
      <circle cx="23" cy="20" fill="none" r="11" stroke="#111" strokeWidth="3" />
      <path d="m17 20 4 4 9-11" fill="none" stroke="#111" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      <text fill="#111" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="700" x="42" y="19">Norton</text>
      <text fill="#111" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="700" x="43" y="30">SECURED</text>
    </svg>
  );
}

function ReclameAquiLogo(): React.ReactElement {
  return (
    <svg aria-hidden="true" className="h-8 w-[112px]" viewBox="0 0 140 40">
      <rect fill="#78be20" height="40" rx="6" width="140" />
      <path d="M21 12h16v12H27l-6 5v-5h-6V12h6Z" fill="#fff" />
      <circle cx="24" cy="18" fill="#78be20" r="1.5" />
      <circle cx="31" cy="18" fill="#78be20" r="1.5" />
      <path d="M23 22c2.6 1.8 6.6 1.8 9.2 0" fill="none" stroke="#78be20" strokeLinecap="round" strokeWidth="1.7" />
      <text fill="#fff" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="800" x="45" y="18">Reclame</text>
      <text fill="#fff" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="800" x="45" y="31">AQUI</text>
    </svg>
  );
}

function GoogleSafeLogo(): React.ReactElement {
  return (
    <svg aria-hidden="true" className="h-8 w-[124px]" viewBox="0 0 154 40">
      <rect fill="#fff" height="40" rx="6" width="154" />
      <path d="M22 9 34 14v7c0 7.2-5 10.6-12 13-7-2.4-12-5.8-12-13v-7l12-5Z" fill="#1a73e8" />
      <path d="m17 21 3.4 3.4 7-8" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
      <circle cx="48" cy="16" fill="#4285f4" r="3.5" />
      <circle cx="56" cy="16" fill="#ea4335" r="3.5" />
      <circle cx="64" cy="16" fill="#fbbc05" r="3.5" />
      <circle cx="72" cy="16" fill="#34a853" r="3.5" />
      <text fill="#202124" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700" x="45" y="30">Site seguro</text>
    </svg>
  );
}
