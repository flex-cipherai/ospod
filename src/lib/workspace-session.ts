import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { WORKSPACE_COOKIE } from "@/lib/auth";

/** Invite links carry a secret token; the database only ever sees its SHA-256. */
export const hashInviteToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Remember which workspace the dashboard shows. getWorkspace() still checks membership on every request. */
export async function rememberWorkspace(id: string) {
  (await cookies()).set(WORKSPACE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
