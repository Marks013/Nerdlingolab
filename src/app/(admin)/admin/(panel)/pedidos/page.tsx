import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

import { OrdersTable } from "@/features/orders/components/orders-table";
import { requireAdmin } from "@/lib/admin";
import { getAdminOrders, resolveAdminOrderFilters } from "@/lib/orders/queries";

export const dynamic = "force-dynamic";

interface AdminOrdersPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminOrdersPage({
  searchParams
}: AdminOrdersPageProps): Promise<React.ReactElement> {
  await requireAdmin();

  const filters = parseOrderFilters(await searchParams);
  const orders = await getAdminOrders(filters);

  return (
    <main>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <OrdersTable filters={filters} orders={orders} />
      </div>
    </main>
  );
}

function normalizeSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseOrderFilters(searchParams?: Record<string, string | string[] | undefined>) {
  return resolveAdminOrderFilters({
    endDate: normalizeSearchParam(searchParams?.fim),
    orderStatus: normalizeSearchParam(searchParams?.situacao) as OrderStatus | undefined,
    paymentStatus: normalizeSearchParam(searchParams?.pagamento) as PaymentStatus | undefined,
    query: normalizeSearchParam(searchParams?.busca),
    startDate: normalizeSearchParam(searchParams?.inicio)
  });
}
