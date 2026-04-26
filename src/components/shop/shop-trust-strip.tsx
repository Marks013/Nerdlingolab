import { CreditCard, LockKeyhole, PackageCheck, Truck } from "lucide-react";

const trustItems = [
  {
    title: "Entrega acompanhada",
    description: "Entrega em todo Brasil",
    icon: Truck
  },
  {
    title: "Parcelamento",
    description: "Em até 12x no cartão e Nerdcoins",
    icon: CreditCard
  },
  {
    title: "Pagamentos via Pix",
    description: "Rápido, fácil e seguro",
    icon: PackageCheck
  },
  {
    title: "Segurança",
    description: "Loja com SSL de proteção",
    icon: LockKeyhole
  }
];

export function ShopTrustStrip(): React.ReactElement {
  return (
    <section aria-label="Benefícios NerdLingoLab" className="rounded-lg bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {trustItems.map((item, itemIndex) => (
          <div
            className="flex min-w-0 items-center gap-3 rounded-lg border border-[#eeeeee] p-3 lg:border-y-0 lg:border-l-0 lg:border-r lg:rounded-none lg:p-0 lg:pr-5 last:lg:border-r-0"
            key={item.title}
          >
            <item.icon className="h-10 w-10 shrink-0 stroke-[1.6] text-primary sm:h-12 sm:w-12" />
            <div className="min-w-0">
              <p className="text-base font-bold leading-tight text-primary sm:text-lg">{item.title}</p>
              <p className="mt-1 text-sm leading-snug text-[#4f5d65] sm:text-base">{item.description}</p>
            </div>
            <span className="sr-only">{itemIndex + 1}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
