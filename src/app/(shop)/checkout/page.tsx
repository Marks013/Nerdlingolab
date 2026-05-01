import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CheckoutClient } from "@/features/checkout/components/checkout-client";
import { sanitizeCustomerNextPath } from "@/lib/account/completion";
import { auth } from "@/lib/auth";
import { getCustomerSavedAddresses } from "@/lib/orders/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: {
    follow: false,
    index: false
  }
};

export default async function CheckoutPage(): Promise<React.ReactElement> {
  const session = await auth();

  if (session?.user?.id && !session.user.customerRegistrationComplete) {
    redirect(`/cadastro/google?next=${encodeURIComponent(sanitizeCustomerNextPath("/checkout"))}`);
  }

  const savedAddresses = session?.user?.id
    ? (await getCustomerSavedAddresses(session.user.id)).map((address) => ({
        id: address.id,
        label: address.label,
        recipient: address.recipient,
        postalCode: address.postalCode,
        street: address.street,
        number: address.number,
        complement: address.complement,
        district: address.district,
        city: address.city,
        state: address.state,
        country: address.country,
        isDefault: address.isDefault
      }))
    : [];

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-normal">Checkout</h1>
        <p className="mt-3 text-muted-foreground">
          Informe os dados de entrega para criar o pedido e seguir para o pagamento.
        </p>
      </div>
      <CheckoutClient savedAddresses={savedAddresses} />
    </main>
  );
}
