import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Tujuan link di email konfirmasi & reset password.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/dashboard";
  // Hanya path internal, cegah open redirect. Cek origin hasil parse: "/\evil.com" dan "/\t/evil.com" lolos cek prefix.
  const nextUrl = new URL(nextParam, request.url);
  const next = nextParam.startsWith("/") && nextUrl.origin === request.nextUrl.origin ? nextParam : "/dashboard";

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing token") };

  const target = error ? "/login?error=link" : next;
  return NextResponse.redirect(new URL(target, request.url));
}
