import { CreditCard, Headphones, Mail, MapPin, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Início" },
  { href: "/produtos", label: "Produtos" },
  { href: "/programa-de-fidelidade", label: "Nerdcoins" },
  { href: "/carrinho", label: "Carrinho" }
];

const supportLinks = [
  { href: "/conta", label: "Minha conta" },
  { href: "/checkout", label: "Checkout" },
  { href: "/admin/login", label: "Painel da loja" }
];

export function ShopFooter(): React.ReactElement {
  return (
    <footer className="mt-16 border-t bg-card/40">
      <div className="grid h-1 grid-cols-3" aria-hidden="true">
        <div className="bg-[#00ff48]" />
        <div className="bg-[#01c6ff]" />
        <div className="bg-[#ffa000]" />
      </div>
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <Link className="inline-flex" href="/">
            <Image
              alt="NerdLingoLab"
              className="h-10 w-auto"
              height={44}
              src="/shopify/header_logo.webp"
              width={180}
            />
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            Loja geek com produtos selecionados, compra segura, entrega acompanhada e Nerdcoins
            para recompensar cada pedido elegível.
          </p>
          <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-primary" />
              Atendimento em português do Brasil
            </span>
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              contato@nerdlingolab.com
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Envio para todo o Brasil
            </span>
          </div>
        </div>

        <FooterLinkColumn links={footerLinks} title="Loja" />
        <FooterLinkColumn links={supportLinks} title="Ajuda" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-4 border-t px-4 py-6 sm:px-6 md:grid-cols-3 lg:px-8">
        <TrustBadge icon={ShieldCheck} text="Ambiente protegido" />
        <TrustBadge icon={CreditCard} text="Pagamento seguro" />
        <TrustBadge icon={Truck} text="Entrega acompanhada" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 border-t px-4 py-6 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>© 2026 NerdLingoLab. Todos os direitos reservados.</p>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-7 w-[90px] bg-contain bg-left bg-no-repeat"
            style={{ backgroundImage: "url('/shopify/ima_digital.webp')" }}
          />
          <span>Compra revisada com cuidado do pedido à entrega.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterLinkColumn({
  links,
  title
}: {
  links: Array<{ href: string; label: string }>;
  title: string;
}): React.ReactElement {
  return (
    <nav aria-label={title}>
      <p className="font-semibold">{title}</p>
      <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
        {links.map((link) => (
          <li key={link.href}>
            <Link className="underline-offset-4 transition hover:text-foreground hover:underline" href={link.href}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TrustBadge({
  icon: Icon,
  text
}: {
  icon: typeof ShieldCheck;
  text: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-background p-3 text-sm font-medium">
      <Icon className="h-4 w-4 text-primary" />
      {text}
    </div>
  );
}
