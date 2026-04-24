import { notFound } from "next/navigation";

import { CustomerOrderDetail } from "@/features/account/components/customer-order-detail";
import { auth } from "@/lib/auth";
import { getCustomerOrderById } from "@/lib/orders/queries";

export const dynamic = "force-dynamic";

interface CustomerOrderPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CustomerOrderPage({
  params
}: CustomerOrderPageProps): Promise<React.ReactElement> {
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const { id } = await params;
  const order = await getCustomerOrderById({
    orderId: id,
    userId: session.user.id
  });

  if (!order) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <CustomerOrderDetail order={order} />
    </main>
  );
}
