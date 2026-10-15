import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, toLocale } from "@/lib/i18n";
import type { Database } from "@/types/database";

// UX saja: gerbang sebenarnya ada di RLS (user_id = auth.uid()).
// /api/cron dilindungi CRON_SECRET di route-nya sendiri.
const PUBLIC_PATHS = ["/", "/manifest.webmanifest", "/login", "/signup", "/forgot-password", "/auth", "/track", "/donasi", "/privacy", "/api/cron"];
// Route handler di luar app/[lang]: tidak di-rewrite.
const NO_LOCALE_PATHS = ["/api", "/auth/confirm", "/manifest.webmanifest"];

const matches = (path: string, list: string[]) =>
  list.some((p) => path === p || path.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Bahasa dari cookie, URL tetap tanpa prefix: /dashboard → app/[lang]/dashboard.
  const locale = toLocale(request.cookies.get(LANG_COOKIE)?.value);
  const pass = () =>
    matches(path, NO_LOCALE_PATHS)
      ? NextResponse.next({ request })
      : NextResponse.rewrite(new URL(`/${locale}${path}${request.nextUrl.search}`, request.url), { request });
  let response = pass();

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
          response = pass();
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

  const redirect = (to: string) => {
    const res = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (matches(path, PUBLIC_PATHS)) {
    // Landing, login, dan daftar tidak berguna bagi yang sudah login.
    if (loggedIn && (path === "/" || path === "/login" || path === "/signup")) return redirect("/dashboard");
    return response;
  }

  if (!loggedIn) return redirect("/login");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
