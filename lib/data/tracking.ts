import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Data publik satu commission berdasarkan kode tracking (tanpa harga/kontak). */
export async function getTracking(code: string) {
  if (!/^[0-9a-f]{16}$/.test(code)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_tracking", { p_code: code }).maybeSingle();
  if (error) throw error;
  return data;
}
