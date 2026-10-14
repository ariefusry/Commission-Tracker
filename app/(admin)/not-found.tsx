import { SearchX } from "lucide-react";
import Link from "next/link";
import { StateMessage } from "@/components/state-message";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <StateMessage icon={SearchX} title="Data tidak ditemukan" description="Data ini mungkin sudah dihapus atau link-nya salah.">
      <Button variant="outline" nativeButton={false} render={<Link href="/commissions" />}>
        Ke daftar commission
      </Button>
    </StateMessage>
  );
}
