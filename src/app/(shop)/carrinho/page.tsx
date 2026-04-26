import { CartClient } from "@/features/cart/components/cart-client";

export default function CartPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-[#f6f7f8] px-5 py-10">
      <div className="mx-auto w-full max-w-[1360px]">
        <CartClient />
      </div>
    </main>
  );
}
