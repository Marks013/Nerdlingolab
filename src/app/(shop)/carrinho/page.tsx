import { CartClient } from "@/features/cart/components/cart-client";

export default function CartPage(): React.ReactElement {
  return (
    <main className="geek-page min-h-screen px-5 py-10">
      <div className="mx-auto w-full max-w-[1360px]">
        <div className="mb-8">
          <h1 className="geek-title text-4xl font-medium tracking-normal text-black">Carrinho</h1>
          <p className="mt-3 max-w-2xl text-[#4f5d65]">Revise seus itens, aplique cupons e acompanhe a entrega em um painel mais vivo.</p>
        </div>
        <CartClient />
      </div>
    </main>
  );
}
