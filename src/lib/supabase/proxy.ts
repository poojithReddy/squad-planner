import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
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
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Keep this call immediately after client creation so stale tokens are refreshed.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const pathname = request.nextUrl.pathname;
  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/teams") || pathname.startsWith("/tournaments") || pathname.startsWith("/admin") || pathname.startsWith("/profile");
  const isGuestOnly = pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";

  if (!isAuthenticated && isProtected) {
    return redirectWithCookies(request, response, "/login");
  }

  if (isAuthenticated && isGuestOnly) {
    return redirectWithCookies(request, response, "/dashboard");
  }

  return response;
}

function redirectWithCookies(request: NextRequest, source: NextResponse, destination: string) {
  const url = request.nextUrl.clone();
  url.pathname = destination;
  url.search = "";
  const redirectResponse = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}
