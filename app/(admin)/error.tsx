"use client"; // Error boundary wajib Client Component

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { StateMessage } from "@/components/state-message";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StateMessage
      icon={TriangleAlert}
      title="Terjadi kesalahan"
      description="Data gagal dimuat. Periksa koneksi internet lalu coba lagi."
    >
      <Button onClick={() => retry()}>Coba lagi</Button>
      <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
        Ke dashboard
      </Button>
    </StateMessage>
  );
}
