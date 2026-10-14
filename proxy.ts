import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isActive } from "@/lib/subscription";
import type { Database } from "@/types/database";

// UX saja: gerbang sebenarnya ada di RLS (has_access()).
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/auth", "/track"];
const NO_SUBSCRIPTION_PATHS = ["/billing", "/reset-password"];

const matches = (path: string, list: string[]) =>
  list.some((p) => path === p || path.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;

  const redirect = (to: string) => {
    const res = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (matches(path, PUBLIC_PATHS)) {
    if (loggedIn && (path === "/login" || path === "/signup")) return redirect("/dashboard");
    return response;
  }

  if (!loggedIn) return redirect("/login");
  if (matches(path, NO_SUBSCRIPTION_PATHS)) return response;

  const { data: sub } = await supabase.from("subscriptions").select("active_until").maybeSingle();
  if (!isActive(sub?.active_until ?? null)) return redirect("/billing");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
