import { NextResponse } from "next/server";
import { ADMIN_PATH, COOKIE, logoutUrl } from "@/server/auth/cognito";

// POST only, so a link or prefetch can't sign the admin out. Clears our cookies and
// Cognito's managed login session, which then redirects to the storefront.
export async function POST() {
  const response = NextResponse.redirect(logoutUrl(), 303);
  response.cookies.delete({ name: COOKIE.access, path: ADMIN_PATH });
  response.cookies.delete({ name: COOKIE.refresh, path: ADMIN_PATH });
  return response;
}
