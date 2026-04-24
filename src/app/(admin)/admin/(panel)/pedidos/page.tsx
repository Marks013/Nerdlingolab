import { OrdersTable } from "@/features/orders/components/orders-table";
import { requireAdmin } from "@/lib/admin";
import { getAdminOrders } from "@/lib/orders/queries";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage(): Promise<React.ReactElement> {
  await requireAdmin();

  const orders = await getAdminOrders();

  return (
    <main>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <OrdersTable orders={orders} />
      </div>
    </main>
  );
}
