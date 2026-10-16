import { NextResponse, type NextRequest } from "next/server";
import { removeWipFiles } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

const RETENTION_DAYS = 30;
const BATCH = 100; // batas jumlah file per panggilan remove()

/**
 * Dipanggil Vercel Cron setiap hari: hapus gambar WIP dari commission yang
 * selesai lebih dari 30 hari lalu (hemat kuota storage gratis bersama).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("wip_images")
    .select("id, storage_path, commissions!inner(status, completed_at)")
    .eq("commissions.status", "done")
    .lt("commissions.completed_at", cutoff)
    .limit(1000);
  if (error) {
    console.error("cleanup-wip select", error);
    return NextResponse.json({ error: "select failed" }, { status: 500 });
  }

  let deleted = 0;
  for (let i = 0; i < data.length; i += BATCH) {
    const batch = data.slice(i, i + BATCH);
    // File yang sudah tidak ada dianggap terhapus (kalau tidak, batch yang sama macet di sini setiap hari).
    if (!(await removeWipFiles(supabase, batch.map((w) => w.storage_path)))) {
      break; // baris dibiarkan agar dicoba lagi besok
    }
    const rows = await supabase.from("wip_images").delete().in("id", batch.map((w) => w.id));
    if (rows.error) {
      console.error("cleanup-wip rows", rows.error);
      break;
    }
    deleted += batch.length;
  }
  return NextResponse.json({ deleted, cutoff });
}
