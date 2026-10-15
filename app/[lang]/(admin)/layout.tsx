import { AppShell } from "@/components/app-header";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
