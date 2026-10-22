import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/config/site";
import {
  ADMIN_PATH,
  COOKIE,
  REFRESH_TOKEN_SECONDS,
  refreshTokens,
  secureCookies,
  tokenExpiresAt,
} from "@/server/auth/cognito";

// Convenience only: sends signed-out visitors to the login page and renews the access token
// from the refresh token before it expires. Authorization happens in requireAdmin().

const RENEW_BEFORE_MS = 60_000;

export async function proxy(request: NextRequest) {
  const access = request.cookies.get(COOKIE.access)?.value;
  if (access && tokenExpiresAt(access) - Date.now() > RENEW_BEFORE_MS) return NextResponse.next();

  const refresh = request.cookies.get(COOKIE.refresh)?.value;
  if (refresh) {
    try {
      const tokens = await refreshTokens(refresh);
      // Forward the new token to this request's render, and store it in the browser.
      request.cookies.set(COOKIE.access, tokens.access_token);
      const response = NextResponse.next({ request: { headers: request.headers } });
      const cookie = { httpOnly: true, secure: secureCookies, sameSite: "lax", path: ADMIN_PATH } as const;
      response.cookies.set(COOKIE.access, tokens.access_token, { ...cookie, maxAge: tokens.expires_in });
      if (tokens.refresh_token) {
        response.cookies.set(COOKIE.refresh, tokens.refresh_token, { ...cookie, maxAge: REFRESH_TOKEN_SECONDS });
      }
      return response;
    } catch {
      // Refresh token expired or revoked: fall through to a fresh login.
    }
  }

  // Public site URL, not request.url: behind Amplify's proxy that is the internal localhost address.
  const login = new URL("/api/auth/login", site.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
