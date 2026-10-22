import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_PATH, COOKIE, verifyAdminToken } from "./cognito";

/**
 * The real admin check. Call it at the top of every admin page, layout and Server Action:
 * src/proxy.ts only redirects for convenience and must not be relied on for security.
 */
export async function requireAdmin() {
  const token = (await cookies()).get(COOKIE.access)?.value;
  if (token) {
    try {
      const payload = await verifyAdminToken(token);
      return { userId: payload.sub, username: payload.username };
    } catch {
      // Expired, tampered with, or no longer in the admin group: sign in again.
    }
  }
  redirect(`/api/auth/login?next=${encodeURIComponent(ADMIN_PATH)}`);
}
