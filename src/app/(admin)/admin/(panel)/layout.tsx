import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin";
import { getOverdueShipmentSummary } from "@/lib/shipping/overdue";

export default async function AdminPanelLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactElement> {
  await requireAdmin();
  const overdueShipments = await getOverdueShipmentSummary();

  return <AdminShell shippingAlertCount={overdueShipments.count}>{children}</AdminShell>;
}
