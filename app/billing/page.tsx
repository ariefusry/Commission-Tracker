import Link from "next/link";
import { Suspense } from "react";
import { AppShell } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient, getActiveUntil } from "@/lib/supabase/server";
import { daysLeft } from "@/lib/subscription";

async function Status() {
  const supabase = await createClient();
  const activeUntil = await getActiveUntil(supabase);
  const left = daysLeft(activeUntil);

  return (
    <>
      <CardDescription>
        {left > 0
          ? `Aktif sampai ${activeUntil} (${left} hari lagi).`
          : "Masa trial atau langganan kamu sudah habis."}
      </CardDescription>
      {left > 0 && (
        <Link href="/dashboard" className="text-sm underline underline-offset-4">
          Kembali ke dashboard
        </Link>
      )}
    </>
  );
}

export default function BillingPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl">
        <Card>
          <CardHeader className="gap-2">
            <CardTitle>Langganan</CardTitle>
            <Suspense fallback={<CardDescription>Memuat status...</CardDescription>}>
              <Status />
            </Suspense>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            {/* Tombol bayar menyusul di Milestone 7 (Midtrans). */}
            <p>Pembayaran online belum tersedia. Hubungi admin untuk memperpanjang langganan.</p>
            <p>Data commission kamu tetap tersimpan dan bisa diakses lagi setelah diperpanjang.</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
