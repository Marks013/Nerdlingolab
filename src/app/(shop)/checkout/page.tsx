import { CheckoutClient } from "@/features/checkout/components/checkout-client";

export default function CheckoutPage(): React.ReactElement {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Checkout</h1>
        <p className="mt-3 text-muted-foreground">
          Informe os dados de entrega para criar o pedido e seguir para o pagamento.
        </p>
      </div>
      <CheckoutClient />
    </main>
  );
}
