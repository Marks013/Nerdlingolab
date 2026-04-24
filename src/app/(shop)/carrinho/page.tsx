import { CartClient } from "@/features/cart/components/cart-client";

export default function CartPage(): React.ReactElement {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Carrinho</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Revise seus produtos antes do checkout. Descontos, pontos e frete serão confirmados
          antes do pagamento.
        </p>
      </div>
      <CartClient />
    </main>
  );
}
