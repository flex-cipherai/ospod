import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseConfig } from "@/lib/env";

/** Pages that need a signed-in user. */
const PROTECTED = ["/app", "/admin"];
/** Pages a signed-in user has no reason to see. */
const AUTH_PAGES = ["/login", "/signup"];

const matches = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/**
 * Refreshes the Supabase session cookie on every request and does a quick
 * signed-in check. Real authorisation (including the super admin check) happens
 * on the server for each page and in the database's row level security.
 */
const PUBLIC_MEDIA = /^\/(feed|e|c|t)\//;

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // The feeds domain (feeds.ospod.io) serves only feeds and media: /my-show → the show's feed.
  if (request.headers.get("host")?.startsWith("feeds.")) {
    if (PUBLIC_MEDIA.test(path)) return NextResponse.next();
    const slug = path.slice(1).replace(/\/+$/, "");
    if (/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9](\.xml|\.rss)?$/i.test(slug)) {
      const url = request.nextUrl.clone();
      url.pathname = `/feed/${slug}`;
      return NextResponse.rewrite(url);
    }
    return new NextResponse("Not found", { status: 404 });
  }
  // Podcast apps never sign in: skip the session work for feeds and media.
  if (PUBLIC_MEDIA.test(path)) return NextResponse.next();

  const config = supabaseConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims() verifies the token. Don't add code between creating the client and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const redirectTo = (target: URL) => {
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!signedIn && matches(path, PROTECTED)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    return redirectTo(url);
  }

  if (signedIn && matches(path, AUTH_PAGES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return redirectTo(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static files and images.
    "/((?!_next/static|_next/image|brand/|favicon|icon-|apple-touch-icon|og-image|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
  ],
};
