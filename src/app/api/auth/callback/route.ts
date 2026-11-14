import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/config/site";
import {
  ADMIN_PATH,
  CALLBACK_PATH,
  COOKIE,
  REFRESH_TOKEN_SECONDS,
  exchangeCode,
  safeNext,
  secureCookies,
  verifyAdminToken,
} from "@/server/auth/cognito";

const FAILED = "Pieslēgšanās neizdevās. Mēģiniet vēlreiz no /admin.";

// Cognito redirects here with ?code&state after a successful sign-in.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const saved = parseOauthCookie(request.cookies.get(COOKIE.oauth)?.value);
  const code = params.get("code");

  if (params.get("error")) {
    console.warn("Cognito returned an error:", params.get("error"), params.get("error_description"));
    return plain(400, FAILED);
  }
  if (!code || !saved || saved.state !== params.get("state")) {
    // No login of ours to finish: the return from Cognito's passkey page, a refresh or an
    // expired attempt. The Cognito session usually still exists, so a fresh login completes
    // without prompting. The retry cookie turns a second miss into an error, not a loop.
    if (request.cookies.has(COOKIE.retry)) {
      console.warn("Admin login restart failed", { hasCode: Boolean(code), hasSaved: Boolean(saved) });
      return plain(400, FAILED);
    }
    const login = new URL("/api/auth/login", site.url);
    login.searchParams.set("next", safeNext(saved?.next));
    const restart = NextResponse.redirect(login);
    restart.cookies.set(COOKIE.retry, "1", {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "lax",
      path: CALLBACK_PATH,
      maxAge: 60,
    });
    return restart;
  }

  let tokens;
  try {
    tokens = await exchangeCode(code, saved.verifier);
  } catch (error) {
    console.error("Cognito code exchange failed", error);
    return plain(502, FAILED);
  }
  try {
    await verifyAdminToken(tokens.access_token);
  } catch (error) {
    console.warn("Admin login rejected:", error instanceof Error ? error.message : error);
    return plain(403, "Šim lietotājam nav piekļuves administrācijai.");
  }

  // Built from the public site URL: behind Amplify's proxy, request.url is the internal localhost address.
  const response = NextResponse.redirect(new URL(safeNext(saved.next), site.url));
  response.cookies.delete({ name: COOKIE.oauth, path: CALLBACK_PATH });
  response.cookies.delete({ name: COOKIE.retry, path: CALLBACK_PATH });
  const cookie = { httpOnly: true, secure: secureCookies, sameSite: "lax", path: ADMIN_PATH } as const;
  response.cookies.set(COOKIE.access, tokens.access_token, { ...cookie, maxAge: tokens.expires_in });
  if (tokens.refresh_token) {
    response.cookies.set(COOKIE.refresh, tokens.refresh_token, { ...cookie, maxAge: REFRESH_TOKEN_SECONDS });
  }
  return response;
}

function parseOauthCookie(value: string | undefined) {
  try {
    const parsed = value ? JSON.parse(value) : null;
    return parsed && typeof parsed.state === "string" && typeof parsed.verifier === "string"
      ? (parsed as { state: string; verifier: string; next?: string })
      : null;
  } catch {
    return null;
  }
}

const plain = (status: number, text: string) =>
  new NextResponse(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
