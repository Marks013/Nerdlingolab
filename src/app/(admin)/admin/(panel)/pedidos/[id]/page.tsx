import { notFound } from "next/navigation";

import { OrderDetail } from "@/features/orders/components/order-detail";
import { requireAdmin } from "@/lib/admin";
import { getAdminOrderById } from "@/lib/orders/queries";

export const dynamic = "force-dynamic";

interface AdminOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminOrderDetailPage({
  params
}: AdminOrderDetailPageProps): Promise<React.ReactElement> {
  await requireAdmin();

  const { id } = await params;
  const order = await getAdminOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <main>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <OrderDetail order={order} />
      </div>
    </main>
  );
}
