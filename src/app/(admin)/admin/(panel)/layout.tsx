import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin";

export default async function AdminPanelLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactElement> {
  await requireAdmin();

  return <AdminShell>{children}</AdminShell>;
}
