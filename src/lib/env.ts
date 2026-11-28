/** Public configuration. Every value here ends up in the browser, so never put a secret in it. */

export function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * The site's own address, without a trailing slash. The feeds domain (feeds.ospod.io)
 * only serves feeds, so it's never used as the site's address, even if Netlify lists
 * it as the primary domain.
 */
export function siteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.URL, // set by Netlify: the primary domain
    process.env.DEPLOY_PRIME_URL, // set by Netlify on branch and preview deploys
  ];
  const usable = candidates.find((u) => {
    if (!u) return false;
    try {
      return !new URL(u).hostname.startsWith("feeds.");
    } catch {
      return false;
    }
  });
  const fallback = process.env.NODE_ENV === "production" ? "https://ospod.netlify.app" : "http://localhost:3000";
  return (usable ?? fallback).replace(/\/+$/, "");
}

/** Where podcast feeds will be served (Milestone 3). */
export const FEED_HOST = "feeds.ospod.io";

export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "flex@sdfmgroup.com";

export const googleSignInEnabled = process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === "true";
