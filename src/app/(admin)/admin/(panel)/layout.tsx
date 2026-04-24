import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminPanelLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return <AdminShell>{children}</AdminShell>;
}
