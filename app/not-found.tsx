import { SearchX } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { StateMessage } from "@/components/state-message";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <div className="grid w-full max-w-md gap-6">
        <div className="justify-self-center">
          <Logo href={null} />
        </div>
        <StateMessage icon={SearchX} title="Halaman tidak ditemukan" description="Periksa kembali alamat yang kamu buka.">
          <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
            Ke beranda
          </Button>
        </StateMessage>
      </div>
    </main>
  );
}
