/** Public configuration. Every value here ends up in the browser, so never put a secret in it. */

export function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/** The site's own address, without a trailing slash. */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL || // set by Netlify on production deploys
    process.env.DEPLOY_PRIME_URL || // set by Netlify on branch and preview deploys
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "flex@sdfmgroup.com";

export const googleSignInEnabled = process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === "true";
