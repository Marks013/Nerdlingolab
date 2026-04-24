import Image from "next/image";

const trustItems = [
  {
    title: "Entrega acompanhada",
    description: "Frete calculado antes do pagamento e rastreamento do pedido.",
    image: "/shopify/nerd-icon-support.webp"
  },
  {
    title: "Carrinho seguro",
    description: "Cupons, estoque e valores conferidos antes da confirmação.",
    image: "/shopify/nerd-icon-cart.webp"
  },
  {
    title: "Nerdcoins",
    description: "Ganhe pontos em compras elegíveis e resgate no checkout.",
    image: "/shopify/nerd-icon-nerdcoins.webp"
  }
];

export function ShopTrustStrip(): React.ReactElement {
  return (
    <section aria-label="Benefícios NerdLingoLab" className="grid gap-3 md:grid-cols-3">
      {trustItems.map((item) => (
        <div className="flex items-start gap-3 rounded-md border bg-card p-4" key={item.title}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Image alt="" className="h-8 w-8 object-contain" height={48} src={item.image} width={48} />
          </div>
          <div>
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
